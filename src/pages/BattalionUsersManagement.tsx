import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import {
  Users,
  Search,
  Pencil,
  Shield,
  User,
  Mail,
  Calendar,
  Loader2,
  Building2,
  UserCog,
  MapPin,
  Trash2,
  AlertTriangle,
  Hash,
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
  battalion_name: string | null;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: AppRole;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "מנהל ראשי",
  battalion_admin: 'מנהל גדוד תע"ם',
  driver: "משתמש גדוד",
};

const BattalionUsersManagement = () => {
  const navigate = useNavigate();
  const { user, canDelete, isSuperAdmin } = useAuth();
  const { isLoading: roleLoading } = useUserRole();
  
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editFormData, setEditFormData] = useState({
    full_name: "",
    outpost: "",
    region: "",
    military_role: "",
    platoon: "",
    personal_number: "",
    battalion_name: "",
    role: "driver" as AppRole,
  });
  const [saving, setSaving] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!roleLoading && !isSuperAdmin) {
      navigate("/");
      return;
    }
    if (isSuperAdmin) {
      fetchUsers();
    }
  }, [isSuperAdmin, roleLoading, navigate]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_type", "battalion").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      setProfiles(profilesRes.data || []);
      setUserRoles((rolesRes.data || []) as UserRole[]);

      try {
        const { data: emailData, error: emailError } = await supabase.functions.invoke('get-user-emails');
        if (!emailError && emailData?.emailMap) {
          setUserEmails(emailData.emailMap);
        }
      } catch (e) {
        console.log('Could not fetch emails');
      }
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error("שגיאה בטעינת המשתמשים");
    } finally {
      setLoading(false);
    }
  };

  const getUserRole = (userId: string): AppRole => {
    const roleEntry = userRoles.find(r => r.user_id === userId);
    return roleEntry?.role || "driver";
  };

  const handleEditClick = (profile: UserProfile) => {
    setEditingUser(profile);
    setEditFormData({
      full_name: profile.full_name || "",
      outpost: profile.outpost || "",
      region: profile.region || "",
      military_role: profile.military_role || "",
      platoon: profile.platoon || "",
      personal_number: profile.personal_number || "",
      battalion_name: profile.battalion_name || "",
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
            outpost: editFormData.outpost || null,
            region: editFormData.region || null,
            military_role: editFormData.military_role || null,
            platoon: editFormData.platoon || null,
            personal_number: editFormData.personal_number || null,
            battalion_name: editFormData.battalion_name || null,
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
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { targetUserId: deletingUser.user_id }
      });
      if (error) throw error;
      toast.success("המשתמש נמחק בהצלחה");
      setDeletingUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error("שגיאה במחיקת המשתמש");
    } finally {
      setDeleting(false);
    }
  };

  const filteredProfiles = profiles.filter(p =>
    p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.outpost?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.personal_number?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (userEmails[p.user_id]?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getRoleBadgeStyle = (role: AppRole) => {
    switch (role) {
      case 'battalion_admin':
        return 'bg-purple-500/90 text-white';
      default:
        return 'bg-indigo-500/90 text-white';
    }
  };

  if (roleLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!isSuperAdmin) return null;

  const battalionAdminCount = profiles.filter(p => getUserRole(p.user_id) === 'battalion_admin').length;
  const regularCount = profiles.filter(p => getUserRole(p.user_id) === 'driver').length;

  return (
    <AppLayout>
      <div className="p-4 pb-24 max-w-4xl mx-auto" dir="rtl">
        <PageHeader
          icon={Users}
          title='ניהול משתמשי גדוד תע"ם'
          subtitle="צפייה ועריכת משתמשי גדוד"
          badge='גדוד תע"ם'
        />

        <div className="glass-card p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-600/20 flex items-center justify-center">
                <UserCog className="w-6 h-6 text-indigo-500" />
              </div>
              <div>
                <p className="text-2xl font-black text-foreground">{profiles.length}</p>
                <p className="text-sm text-muted-foreground">משתמשי גדוד רשומים</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">
                {battalionAdminCount} מנהלי גדוד
              </Badge>
              <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/30">
                {regularCount} משתמשים רגילים
              </Badge>
            </div>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי שם, מוצב, מספר אישי או מייל..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10 h-12 rounded-xl bg-muted/50 border-0"
          />
        </div>

        <div className="space-y-3">
          {filteredProfiles.map((profile) => {
            const role = getUserRole(profile.user_id);
            const email = userEmails[profile.user_id];
            
            return (
              <div key={profile.id} className="glass-card p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      role === 'battalion_admin' 
                        ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20' 
                        : 'bg-gradient-to-br from-indigo-500/20 to-blue-500/20'
                    }`}>
                      {role === 'battalion_admin' ? (
                        <Shield className="w-6 h-6 text-purple-500" />
                      ) : (
                        <User className="w-6 h-6 text-indigo-500" />
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
                      {profile.personal_number && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Hash className="w-3 h-3" />
                          מ"א: {profile.personal_number}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className={getRoleBadgeStyle(role)}>
                          {ROLE_LABELS[role] || 'משתמש גדוד'}
                        </Badge>
                        {profile.outpost && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {profile.outpost}
                          </span>
                        )}
                        {profile.battalion_name && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {profile.battalion_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(profile)} className="w-10 h-10 rounded-xl">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    {canDelete && (
                      <Button variant="ghost" size="icon" onClick={() => setDeletingUser(profile)} className="w-10 h-10 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 gap-2 text-sm">
                  {profile.region && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>אזור: {profile.region}</span>
                    </div>
                  )}
                  {profile.military_role && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <UserCog className="w-4 h-4" />
                      <span>תפקיד: {profile.military_role}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>הצטרף: {new Date(profile.created_at).toLocaleDateString("he-IL")}</span>
                  </div>
                </div>
              </div>
            );
          })}
          
          {filteredProfiles.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>לא נמצאו משתמשי גדוד</p>
            </div>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-card" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                <Pencil className="w-5 h-5 text-primary" />
                עריכת משתמש גדוד
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {editingUser && userEmails[editingUser.user_id] && (
                <div className="p-3 rounded-xl bg-muted/50 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{userEmails[editingUser.user_id]}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-foreground">שם מלא *</Label>
                <Input value={editFormData.full_name} onChange={(e) => setEditFormData(prev => ({ ...prev, full_name: e.target.value }))} placeholder="שם מלא" className="h-12 rounded-xl" />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-foreground"><Hash className="w-4 h-4 text-blue-500" />מספר אישי</Label>
                <Input value={editFormData.personal_number} onChange={(e) => setEditFormData(prev => ({ ...prev, personal_number: e.target.value }))} placeholder="מספר אישי" dir="ltr" className="h-12 rounded-xl text-right" />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-foreground"><Shield className="w-4 h-4 text-amber-500" />הרשאות</Label>
                <Select value={editFormData.role} onValueChange={(value: AppRole) => setEditFormData(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger className="h-12 rounded-xl bg-background text-foreground border-border">
                    <SelectValue placeholder="בחר הרשאה" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-[10000]">
                    <SelectItem value="super_admin">מנהל ראשי (מח"ט)</SelectItem>
                    <SelectItem value="battalion_admin">מנהל גדוד תע"ם</SelectItem>
                    <SelectItem value="driver">משתמש גדוד רגיל</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-foreground"><Building2 className="w-4 h-4 text-indigo-500" />שם הגדוד</Label>
                <Input value={editFormData.battalion_name} onChange={(e) => setEditFormData(prev => ({ ...prev, battalion_name: e.target.value }))} placeholder='גדוד תע"ם 900' className="h-12 rounded-xl" />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">מוצב</Label>
                <Input value={editFormData.outpost} onChange={(e) => setEditFormData(prev => ({ ...prev, outpost: e.target.value }))} placeholder="מוצב" className="h-12 rounded-xl" />
              </div>
              
              <div className="space-y-2">
                <Label className="text-foreground">אזור</Label>
                <Input value={editFormData.region} onChange={(e) => setEditFormData(prev => ({ ...prev, region: e.target.value }))} placeholder="אזור" className="h-12 rounded-xl" />
              </div>
            </div>
            
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditingUser(null)} className="flex-1 h-12 rounded-xl">ביטול</Button>
              <Button onClick={handleSave} disabled={saving || !editFormData.full_name} className="flex-1 h-12 rounded-xl bg-gradient-to-r from-primary to-accent">
                {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                שמירה
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
          <AlertDialogContent className="bg-card" dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-foreground">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                מחיקת משתמש
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                האם אתה בטוח שברצונך למחוק את המשתמש{" "}
                <span className="font-bold text-foreground">{deletingUser?.full_name}</span>?
                <br />פעולה זו לא ניתנת לביטול.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 flex-row-reverse">
              <AlertDialogCancel className="flex-1 h-12 rounded-xl">ביטול</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteUser} disabled={deleting} className="flex-1 h-12 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                {deleting ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" />מוחק...</> : "מחק משתמש"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default BattalionUsersManagement;