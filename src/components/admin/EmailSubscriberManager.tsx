
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Mail,
  Loader2,
  RefreshCw,
  Check,
  X,
  Clock,
  Trash2,
  Key,
  UserPlus,
  ShieldCheck,
  ShieldX
} from "lucide-react";

interface EmailSubscriber {
  id: string;
  email: string;
  created_at: string;
  is_active: boolean;
  is_approved: boolean | null;
  approved_at: string | null;
  access_code_id: string | null;
  access_code?: string | null;
}

interface AccessCode {
  id: string;
  code: string;
  expires_at: string;
  is_used: boolean;
  is_blocked: boolean;
}

export const EmailSubscriberManager = () => {
  const [subscribers, setSubscribers] = useState<EmailSubscriber[]>([]);
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [sendingEmailTo, setSendingEmailTo] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isAddingEmail, setIsAddingEmail] = useState(false);
  const [approveDirectly, setApproveDirectly] = useState(false);
  const [selectedCodeForAdd, setSelectedCodeForAdd] = useState<string>("");
  const { toast } = useToast();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copié !",
        description: "Code d'accès copié dans le presse-papiers",
      });
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const sendApprovalEmail = async (email: string, isApproved: boolean, accessCode?: string) => {
    try {
      console.log(`Sending ${isApproved ? 'approval' : 'rejection'} email to ${email}`);
      const { data, error } = await supabase.functions.invoke('send-approval-email', {
        body: { email, isApproved, accessCode }
      });

      if (error) {
        console.error("Error sending email:", error);
        throw error;
      }

      console.log("Email sent:", data);
      return true;
    } catch (err) {
      console.error("Failed to send email:", err);
      return false;
    }
  };

  useEffect(() => {
    loadSubscribers();
    loadAccessCodes();
  }, []);

  const loadAccessCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('access_codes')
        .select('*')
        .eq('is_blocked', false)
        .order('expires_at', { ascending: false });

      if (error) throw error;
      setAccessCodes(data || []);
    } catch (err) {
      console.error("Error loading access codes:", err);
    }
  };

  const loadSubscribers = async () => {
    setIsLoading(true);
    try {
      // Load subscribers
      const { data: subscribersData, error: subscribersError } = await supabase
        .from('email_subscribers')
        .select('*')
        .order('created_at', { ascending: false });

      if (subscribersError) throw subscribersError;

      // For subscribers with access_code_id, fetch the code
      const subscribersWithCodes = await Promise.all(
        (subscribersData || []).map(async (subscriber) => {
          if (subscriber.access_code_id) {
            const accessCode = accessCodes.find(c => c.id === subscriber.access_code_id);
            if (accessCode) {
              return { ...subscriber, access_code: accessCode.code };
            }
            // If not in local state, fetch from DB
            const { data: codeData } = await supabase
              .from('access_codes')
              .select('code')
              .eq('id', subscriber.access_code_id)
              .maybeSingle();
            return { ...subscriber, access_code: codeData?.code || null };
          }
          return { ...subscriber, access_code: null };
        })
      );

      setSubscribers(subscribersWithCodes);
    } catch (err) {
      console.error("Error loading subscribers:", err);
      toast({
        title: "Erreur",
        description: "Impossible de charger les abonnés",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string, email: string) => {
    const selectedCodeId = selectedCodes[id];
    
    if (!selectedCodeId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un code d'accès",
        variant: "destructive",
      });
      return;
    }

    // Get the access code details
    const accessCode = accessCodes.find(c => c.id === selectedCodeId);
    if (!accessCode) {
      toast({
        title: "Erreur",
        description: "Code d'accès introuvable",
        variant: "destructive",
      });
      return;
    }

    setSendingEmailTo(id);
    try {
      const { error } = await supabase
        .from('email_subscribers')
        .update({
          is_approved: true,
          approved_at: new Date().toISOString(),
          access_code_id: selectedCodeId
        })
        .eq('id', id);

      if (error) throw error;

      // Send approval email with access code
      const emailSent = await sendApprovalEmail(email, true, accessCode.code);

      toast({
        title: "Email validé",
        description: emailSent 
          ? `${email} a été approuvé avec le code ${accessCode.code}.`
          : `${email} a été approuvé (échec de l'envoi de l'email).`,
      });

      await loadSubscribers();
    } catch (err) {
      console.error("Error approving subscriber:", err);
      toast({
        title: "Erreur",
        description: "Impossible de valider l'email",
        variant: "destructive",
      });
    } finally {
      setSendingEmailTo(null);
    }
  };

  const handleReject = async (id: string, email: string) => {
    setSendingEmailTo(id);
    try {
      const { error } = await supabase
        .from('email_subscribers')
        .update({
          is_approved: false,
          is_active: false
        })
        .eq('id', id);

      if (error) throw error;

      // Send rejection email
      const emailSent = await sendApprovalEmail(email, false);

      toast({
        title: "Email rejeté",
        description: emailSent 
          ? `${email} a été rejeté et notifié par email.`
          : `${email} a été rejeté (échec de l'envoi de l'email).`,
      });

      await loadSubscribers();
    } catch (err) {
      console.error("Error rejecting subscriber:", err);
      toast({
        title: "Erreur",
        description: "Impossible de rejeter l'email",
        variant: "destructive",
      });
    } finally {
      setSendingEmailTo(null);
    }
  };

  const handleAddManualEmail = async () => {
    if (!newEmail.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un email",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      toast({
        title: "Erreur",
        description: "Format d'email invalide",
        variant: "destructive",
      });
      return;
    }

    // If approving directly, require access code
    if (approveDirectly && !selectedCodeForAdd) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un code d'accès pour l'approbation directe",
        variant: "destructive",
      });
      return;
    }

    setIsAddingEmail(true);
    try {
      // Check if email already exists
      const { data: existing } = await supabase
        .from('email_subscribers')
        .select('id')
        .eq('email', newEmail.toLowerCase().trim())
        .maybeSingle();

      if (existing) {
        toast({
          title: "Erreur",
          description: "Cet email est déjà dans la liste",
          variant: "destructive",
        });
        setIsAddingEmail(false);
        return;
      }

      const accessCode = approveDirectly ? accessCodes.find(c => c.id === selectedCodeForAdd) : null;

      // Add email to subscribers
      const { error } = await supabase
        .from('email_subscribers')
        .insert({
          email: newEmail.toLowerCase().trim(),
          is_active: true,
          is_approved: approveDirectly ? true : null,
          approved_at: approveDirectly ? new Date().toISOString() : null,
          access_code_id: approveDirectly ? selectedCodeForAdd : null
        });

      if (error) throw error;

      // Send approval email if approving directly
      if (approveDirectly && accessCode) {
        await sendApprovalEmail(newEmail.toLowerCase().trim(), true, accessCode.code);
      }

      toast({
        title: approveDirectly ? "Utilisateur approuvé" : "Email ajouté",
        description: approveDirectly 
          ? `${newEmail} a été ajouté et approuvé avec le code ${accessCode?.code}.`
          : `${newEmail} a été ajouté à la liste des demandes.`,
      });

      setNewEmail("");
      setApproveDirectly(false);
      setSelectedCodeForAdd("");
      setIsAddDialogOpen(false);
      await loadSubscribers();
    } catch (err) {
      console.error("Error adding email:", err);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'email",
        variant: "destructive",
      });
    } finally {
      setIsAddingEmail(false);
    }
  };

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${email} ?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('email_subscribers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Abonné supprimé",
        description: `${email} a été supprimé.`,
      });

      await loadSubscribers();
    } catch (err) {
      console.error("Error deleting subscriber:", err);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'abonné",
        variant: "destructive",
      });
    }
  };

  // Filter subscribers by status
  const pendingSubscribers = subscribers.filter(s => s.is_approved === null && s.is_active);
  const approvedSubscribers = subscribers.filter(s => s.is_approved === true && s.is_active);

  const handleRevoke = async (id: string, email: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir révoquer l'accès de ${email} ?`)) {
      return;
    }

    setSendingEmailTo(id);
    try {
      const { error } = await supabase
        .from('email_subscribers')
        .update({
          is_approved: false,
          is_active: false,
          access_code_id: null
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Accès révoqué",
        description: `L'accès de ${email} a été révoqué.`,
      });

      await loadSubscribers();
    } catch (err) {
      console.error("Error revoking access:", err);
      toast({
        title: "Erreur",
        description: "Impossible de révoquer l'accès",
        variant: "destructive",
      });
    } finally {
      setSendingEmailTo(null);
    }
  };

  return (
    <Card className="bg-gray-800/50 border-gray-700 mt-6">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between flex-wrap gap-2">
          <span className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-emerald-500" />
            Demandes d'inscription ({pendingSubscribers.length})
          </span>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className="border-yellow-500 text-yellow-400">
              <Clock className="w-3 h-3 mr-1" />
              En attente: {pendingSubscribers.length}
            </Badge>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-emerald-600 text-emerald-400 hover:bg-emerald-600/20"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Ajouter un utilisateur
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-800 border-gray-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Ajouter un utilisateur existant</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Ajoutez manuellement un email à la liste des demandes d'inscription pour l'approuver ensuite.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <Input
                    type="email"
                    placeholder="email@exemple.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    disabled={isAddingEmail}
                  />
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="approveDirectly"
                      checked={approveDirectly}
                      onCheckedChange={(checked) => {
                        setApproveDirectly(checked === true);
                        if (!checked) setSelectedCodeForAdd("");
                      }}
                      disabled={isAddingEmail}
                      className="border-gray-600 data-[state=checked]:bg-emerald-600"
                    />
                    <Label htmlFor="approveDirectly" className="text-gray-300 cursor-pointer">
                      Approuver directement (sans passer par l'étape en attente)
                    </Label>
                  </div>

                  {approveDirectly && (
                    <div className="pl-6">
                      <Label className="text-gray-400 text-sm mb-2 block">Code d'accès à attribuer</Label>
                      <Select
                        value={selectedCodeForAdd}
                        onValueChange={setSelectedCodeForAdd}
                        disabled={isAddingEmail}
                      >
                        <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white">
                          <Key className="w-4 h-4 mr-2 text-amber-500" />
                          <SelectValue placeholder="Sélectionner un code" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          {accessCodes
                            .filter(code => !code.is_used && new Date(code.expires_at) > new Date())
                            .map((code) => (
                              <SelectItem 
                                key={code.id} 
                                value={code.id}
                                className="text-white hover:bg-gray-700"
                              >
                                {code.code} (exp: {new Date(code.expires_at).toLocaleDateString("fr-FR")})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                    className="border-gray-600 text-gray-300"
                    disabled={isAddingEmail}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleAddManualEmail}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={isAddingEmail}
                  >
                    {isAddingEmail ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Ajout...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Ajouter
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              size="sm"
              onClick={loadSubscribers}
              disabled={isLoading}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" />
            <p>Chargement des demandes...</p>
          </div>
        ) : pendingSubscribers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucune demande en attente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingSubscribers.map((subscriber) => (
              <div
                key={subscriber.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-yellow-900/20 border-yellow-500/30"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-yellow-600/20">
                    <Mail className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{subscriber.email}</p>
                    <p className="text-gray-400 text-sm">
                      Inscrit le {new Date(subscriber.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge className="bg-yellow-600 text-white flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    En attente
                  </Badge>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Select
                      value={selectedCodes[subscriber.id] || ""}
                      onValueChange={(value) => setSelectedCodes(prev => ({ ...prev, [subscriber.id]: value }))}
                    >
                      <SelectTrigger className="w-[180px] bg-gray-700 border-gray-600 text-white">
                        <Key className="w-4 h-4 mr-2 text-amber-500" />
                        <SelectValue placeholder="Code d'accès" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        {accessCodes
                          .filter(code => !code.is_used && new Date(code.expires_at) > new Date())
                          .map((code) => (
                            <SelectItem 
                              key={code.id} 
                              value={code.id}
                              className="text-white hover:bg-gray-700"
                            >
                              <span className="font-mono">{code.code}</span>
                              <span className="text-gray-400 text-xs ml-2">
                                (exp: {new Date(code.expires_at).toLocaleDateString("fr-FR")})
                              </span>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleApprove(subscriber.id, subscriber.email)}
                      className="text-green-400 hover:text-green-300 hover:bg-green-500/20"
                      title="Valider l'email"
                      disabled={sendingEmailTo === subscriber.id || !selectedCodes[subscriber.id]}
                    >
                      {sendingEmailTo === subscriber.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleReject(subscriber.id, subscriber.email)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                      title="Rejeter l'email"
                      disabled={sendingEmailTo === subscriber.id}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(subscriber.id, subscriber.email)}
                    className="text-gray-400 hover:text-red-500"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Approved Users Section */}
      <CardHeader className="border-t border-gray-700">
        <CardTitle className="text-white flex items-center justify-between flex-wrap gap-2">
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            Utilisateurs approuvés ({approvedSubscribers.length})
          </span>
          <Badge variant="outline" className="border-emerald-500 text-emerald-400">
            <Check className="w-3 h-3 mr-1" />
            Actifs: {approvedSubscribers.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {approvedSubscribers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucun utilisateur approuvé</p>
          </div>
        ) : (
          <div className="space-y-3">
            {approvedSubscribers.map((subscriber) => (
              <div
                key={subscriber.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-emerald-900/20 border-emerald-500/30"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-600/20">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{subscriber.email}</p>
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <span>Approuvé le {subscriber.approved_at ? new Date(subscriber.approved_at).toLocaleDateString("fr-FR") : "N/A"}</span>
                      {subscriber.access_code && (
                        <Badge 
                          variant="outline" 
                          className="border-amber-500 text-amber-400 cursor-pointer text-xs"
                          onClick={() => copyToClipboard(subscriber.access_code!)}
                        >
                          <Key className="w-3 h-3 mr-1" />
                          {subscriber.access_code}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevoke(subscriber.id, subscriber.email)}
                    className="border-red-600 text-red-400 hover:bg-red-600/20"
                    disabled={sendingEmailTo === subscriber.id}
                  >
                    {sendingEmailTo === subscriber.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ShieldX className="w-4 h-4 mr-2" />
                        Révoquer
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(subscriber.id, subscriber.email)}
                    className="text-gray-400 hover:text-red-500"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

