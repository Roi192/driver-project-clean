import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Users, Search, Pencil, Shield, User, Mail, Calendar, Loader2, Building2, Hash,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  military_role: string | null;
  personal_number: string | null;
  department: string | null;
  brigade: string | null;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: AppRole;
}

const ROLE_LABELS: Record<string, string> = {
  maphatch_user: "משתמש רגיל",
  maphatch_admin: "מנהל אגף",
  super_admin: "מנהל ראשי",
};

const ROLE_COLORS: Record<string, string> = {
  maphatch_admin: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  maphatch_user: "bg-slate-500/20 text-slate-300 border-slate-500/40",
  super_admin: "bg-amber-500/20 text-amber-300 border-amber-500/40",
};

const MaphatchUsersManagement = () => {
  const navigate = useNavigate();
  const { user, isSuperAdmin, role } = useAuth();

  const isMaphatchAdmin = role === 'maphatch_admin';
  const canAccess = isSuperAdmin || isMaphatchAdmin;

  const [myDepartment, setMyDepartment] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editRole, setEditRole] = useState<AppRole>('maphatch_user');
  const [editMilitaryRole, setEditMilitaryRole] = useState('');
  const [saving, setSaving] = useState(false);

  // Determine which department to show
  const getDepartment = async (): Promise<string | null> => {
    if (isSuperAdmin) {
      return sessionStorage.getItem('maphatchDeptContext');
    }
    if (isMaphatchAdmin && user?.id) {
      const { data } = await supabase
        .from('profiles')
        .select('department')
        .eq('user_id', user.id)
        .maybeSingle();
      return data?.department || null;
    }
    return null;
  };

  useEffect(() => {
    if (!canAccess) {
      navigate('/');
      return;
    }
    const init = async () => {
      const dept = await getDepartment();
      setMyDepartment(dept);
      if (dept) await fetchUsers(dept);
      else setLoading(false);
    };
    init();
  }, [canAccess, user?.id]);

  const fetchUsers = async (dept: string) => {
    try {
      setLoading(true);
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_type', 'maphatch').eq('department', dept).order('created_at', { ascending: false }),
        supabase.from('user_roles').select('user_id, role'),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      setProfiles(profilesRes.data || []);
      setUserRoles((rolesRes.data || []) as UserRole[]);

      if (isSuperAdmin) {
        const { data: emailData, error: emailError } = await supabase.functions.invoke('get-user-emails');
        if (!emailError && emailData?.emailMap) setUserEmails(emailData.emailMap);
      }
    } catch (err) {
      console.error(err);
      toast.error('שגיאה בטעינת משתמשים');
    } finally {
      setLoading(false);
    }
  };

  const getUserRole = (userId: string): AppRole =>
    userRoles.find((r) => r.user_id === userId)?.role || 'maphatch_user';

  const openEdit = (p: UserProfile) => {
    setEditingUser(p);
    setEditRole(getUserRole(p.user_id));
    setEditMilitaryRole(p.military_role || '');
  };

  const handleSave = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke('update-user-admin', {
        body: {
          targetUserId: editingUser.user_id,
          newRole: editRole,
          profileUpdates: { military_role: editMilitaryRole || null },
        },
      });
      if (error) throw error;
      toast.success('המשתמש עודכן בהצלחה');
      setEditingUser(null);
      if (myDepartment) await fetchUsers(myDepartment);
    } catch (err: any) {
      toast.error(`שגיאה בעדכון: ${err?.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  const filteredProfiles = profiles.filter((p) =>
    p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.personal_number || '').includes(searchQuery) ||
    (userEmails[p.user_id] || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="p-4 max-w-4xl mx-auto" dir="rtl">
        <PageHeader
          title={`ניהול משתמשים — ${myDepartment || ''}`}
          subtitle={`אגף ${myDepartment || ''} · מפח"ט בנימין`}
          icon={Users}
        />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !myDepartment ? (
          <div className="text-center py-20 text-slate-400">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p>לא נמצא אגף — חזור לבחירת מחלקה</p>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="חיפוש לפי שם, מספר אישי או אימייל..."
                className="pr-10 bg-slate-800/60 border-slate-700 text-white"
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
                <p className="text-slate-400 text-sm">סה"כ משתמשים</p>
                <p className="text-2xl font-black text-white">{profiles.length}</p>
              </div>
              <div className="bg-slate-800/60 rounded-xl p-4 border border-emerald-700/40">
                <p className="text-slate-400 text-sm">מנהלי אגף</p>
                <p className="text-2xl font-black text-emerald-400">
                  {profiles.filter(p => getUserRole(p.user_id) === 'maphatch_admin').length}
                </p>
              </div>
            </div>

            {/* Users list */}
            <div className="space-y-3">
              {filteredProfiles.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>לא נמצאו משתמשים</p>
                </div>
              ) : filteredProfiles.map((p) => {
                const uRole = getUserRole(p.user_id);
                return (
                  <div key={p.user_id} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-black text-sm">{p.full_name.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white">{p.full_name}</span>
                        <Badge className={`text-xs border ${ROLE_COLORS[uRole] || ROLE_COLORS.maphatch_user}`}>
                          {ROLE_LABELS[uRole] || uRole}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {p.military_role && (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Shield className="w-3 h-3" />{p.military_role}
                          </span>
                        )}
                        {p.personal_number && (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Hash className="w-3 h-3" />{p.personal_number}
                          </span>
                        )}
                        {userEmails[p.user_id] && (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Mail className="w-3 h-3" />{userEmails[p.user_id]}
                          </span>
                        )}
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(p.created_at).toLocaleDateString('he-IL')}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(p)}
                      className="text-slate-400 hover:text-white flex-shrink-0"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              עריכת משתמש — {editingUser?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">תפקיד</label>
              <Input
                value={editMilitaryRole}
                onChange={(e) => setEditMilitaryRole(e.target.value)}
                placeholder="תפקיד / תואר"
                className="bg-white border-slate-300 text-slate-900"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">הרשאה במערכת</label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as AppRole)}>
                <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maphatch_user">משתמש רגיל (צפייה בלבד)</SelectItem>
                  <SelectItem value="maphatch_admin">מנהל אגף (יכול להוסיף אירועים)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)} disabled={saving}>ביטול</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default MaphatchUsersManagement;
