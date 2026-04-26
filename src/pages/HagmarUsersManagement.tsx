import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Users,
  Search,
  Pencil,
  Shield,
  User,
  Mail,
  Loader2,
  UserCog,
  MapPin,
  Trash2,
  Hash,
  ChevronLeft,
  Home,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { HAGMAR_ALL_SETTLEMENTS } from "@/lib/hagmar-constants";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  outpost: string | null;
  user_type: string | null;
  region: string | null;
  military_role: string | null;
  platoon: string | null;
  personal_number: string | null;
  settlement: string | null;
  id_number: string | null;
  department: string | null;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: AppRole;
}

const HAGMAR_ROLE_LABELS: Record<string, string> = {
  super_admin: "מנהל ראשי",
  hagmar_admin: 'קצין הגמ"ר',
  ravshatz: 'רבש"צ',
  driver: "לוחם",
};

const HagmarUsersManagement = () => {
  const navigate = useNavigate();
  const { user, isSuperAdmin, isHagmarAdmin, canDelete, isRavshatz, role } = useAuth();

  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Edit dialog
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [currentUserSettlement, setCurrentUserSettlement] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    full_name: "",
    settlement: "",
    id_number: "",
    military_role: "",
    role: "driver" as AppRole,
  });
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isRavshatzRole = isRavshatz;
  const canAccess = isSuperAdmin || isHagmarAdmin || isRavshatzRole;

  useEffect(() => {
    if (!canAccess) {
      navigate("/hagmar");
      return;
    }
    // Fetch current user's settlement for ravshatz filtering
    const fetchCurrentProfile = async () => {
      if (user && isRavshatzRole) {
        const { data } = await supabase
          .from("profiles")
          .select("settlement")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data?.settlement) {
          setCurrentUserSettlement(data.settlement);
        }
      }
    };
    fetchCurrentProfile();
    fetchUsers();
  }, [canAccess, navigate, user, isRavshatzRole]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const [profilesRes, rolesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("department", "hagmar")
          .order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      setProfiles(profilesRes.data || []);
      setUserRoles((rolesRes.data || []) as UserRole[]);

      // Fetch emails via edge function
      try {
        const { data: emailData, error: emailError } = await supabase.functions.invoke("get-user-emails");
        if (!emailError && emailData?.emailMap) {
          setUserEmails(emailData.emailMap);
        }
      } catch (e) {
        console.log("Could not fetch emails");
      }
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error("שגיאה בטעינת המשתמשים");
    } finally {
      setLoading(false);
    }
  };

  const getUserRole = (userId: string): AppRole => {
    const roleEntry = userRoles.find((r) => r.user_id === userId);
    return roleEntry?.role || "driver";
  };

  const handleEditClick = (profile: UserProfile) => {
    setEditingUser(profile);
    setEditFormData({
      full_name: profile.full_name || "",
      settlement: profile.settlement || "",
      id_number: profile.id_number || "",
      military_role: profile.military_role || "",
      role: getUserRole(profile.user_id),
    });
  };

  const handleSave = async () => {
    if (!editingUser) return;

    try {
      setSaving(true);

      const { error: updateError } = await supabase.functions.invoke("update-user-admin", {
        body: {
          targetUserId: editingUser.user_id,
          displayName: editFormData.full_name,
          newRole: editFormData.role,
          profileUpdates: {
            full_name: editFormData.full_name,
            settlement: editFormData.settlement || null,
            id_number: editFormData.id_number || null,
            military_role: editFormData.military_role || null,
          },
        },
      });

      if (updateError) throw updateError;

      toast.success("פרטי המשתמש עודכנו בהצלחה");
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error("שגיאה בעדכון המשתמש");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    try {
      setDeleting(true);

      const { error } = await supabase.functions.invoke("delete-user", {
        body: { targetUserId: deletingUser.user_id },
      });

      if (error) throw error;

      toast.success("המשתמש נמחק בהצלחה");
      setDeletingUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      const errorMessage = error.message?.includes("Cannot delete your own account")
        ? "לא ניתן למחוק את החשבון שלך"
        : "שגיאה במחיקת המשתמש";
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  // Ravshatz can only see users from their own settlement
  const visibleProfiles = isRavshatzRole && currentUserSettlement
    ? profiles.filter((p) => p.settlement === currentUserSettlement)
    : profiles;

  const filteredProfiles = visibleProfiles.filter(
    (p) =>
      p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.settlement?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.military_role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      userEmails[p.user_id]?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadgeStyle = (role: AppRole) => {
    switch (role) {
      case "super_admin":
        return "bg-red-500/90 text-white";
      case "hagmar_admin":
        return "bg-amber-500/90 text-white";
      case "ravshatz":
        return "bg-blue-500/90 text-white";
      default:
        return "bg-slate-500/90 text-white";
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 pb-24 max-w-4xl mx-auto" dir="rtl">
        <PageHeader
          icon={Users}
          title='ניהול משתמשי הגמ"ר'
          subtitle="צפייה ועריכת משתמשי מחלקת הגמ״ר"
          badge='הגמ"ר'
        />

        {/* Stats */}
        <div className="glass-card p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
              <UserCog className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">{visibleProfiles.length}</p>
              <p className="text-sm text-muted-foreground">משתמשי הגמ"ר רשומים</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder='חיפוש לפי שם, ישוב, ת.ז, תפקיד או מייל...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10 h-12 rounded-xl bg-muted/50 border-0"
          />
        </div>

        {/* Users List */}
        <div className="space-y-3">
          {filteredProfiles.map((profile) => {
            const role = getUserRole(profile.user_id);
            const email = userEmails[profile.user_id];

            return (
              <div key={profile.id} className="glass-card p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                    {role === "hagmar_admin" || role === "super_admin" ? (
                        <Shield className="w-6 h-6 text-amber-500" />
                      ) : role === "ravshatz" ? (
                        <UserCog className="w-6 h-6 text-blue-500" />
                      ) : (
                        <User className="w-6 h-6 text-slate-500" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{profile.full_name}</h3>
                      {email && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" />
                          {email}
                        </p>
                      )}
                      {profile.id_number && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Hash className="w-3 h-3" />
                          ת.ז: {profile.id_number}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className={getRoleBadgeStyle(role)}>
                          {HAGMAR_ROLE_LABELS[role] || "משתמש"}
                        </Badge>
                        {profile.settlement && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {profile.settlement}
                          </span>
                        )}
                        {profile.military_role && (
                          <span className="text-xs text-muted-foreground">
                            {profile.military_role}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {(isSuperAdmin || isHagmarAdmin) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(profile)}
                        className="w-10 h-10 rounded-xl"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    {(isSuperAdmin || isHagmarAdmin) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingUser(profile)}
                        className="w-10 h-10 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredProfiles.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-semibold">לא נמצאו משתמשים</p>
              <p className="text-sm">אין משתמשים רשומים במחלקת הגמ"ר</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">עריכת משתמש</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>שם מלא</Label>
              <Input
                value={editFormData.full_name}
                onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
              />
            </div>
            <div>
              <Label>ישוב</Label>
              <Select
                value={editFormData.settlement}
                onValueChange={(value) => setEditFormData({ ...editFormData, settlement: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר ישוב" />
                </SelectTrigger>
                <SelectContent>
                  {HAGMAR_ALL_SETTLEMENTS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>תעודת זהות</Label>
              <Input
                value={editFormData.id_number}
                onChange={(e) => setEditFormData({ ...editFormData, id_number: e.target.value })}
              />
            </div>
            <div>
              <Label>תפקיד</Label>
              <Input
                value={editFormData.military_role}
                onChange={(e) => setEditFormData({ ...editFormData, military_role: e.target.value })}
              />
            </div>
            <div>
              <Label>הרשאה</Label>
              <Select
                value={editFormData.role}
                onValueChange={(value) => setEditFormData({ ...editFormData, role: value as AppRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="driver">לוחם</SelectItem>
                  <SelectItem value="ravshatz">רבש"צ</SelectItem>
                  <SelectItem value="hagmar_admin">קצין הגמ"ר</SelectItem>
                  {isSuperAdmin && <SelectItem value="super_admin">מנהל ראשי</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              ביטול
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              שמירה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">מחיקת משתמש</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              האם אתה בטוח שברצונך למחוק את {deletingUser?.full_name}? פעולה זו לא ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default HagmarUsersManagement;