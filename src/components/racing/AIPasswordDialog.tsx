
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Brain, Loader2, Eye, EyeOff, Lock } from 'lucide-react';
import { useAIPassword } from '@/hooks/useAIPassword';
import { toast } from 'sonner';

interface AIPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AIPasswordDialog({ open, onOpenChange, onSuccess }: AIPasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const { validatePassword } = useAIPassword();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      toast.error('Veuillez entrer le mot de passe');
      return;
    }

    setIsValidating(true);
    try {
      const result = await validatePassword(password);
      
      if (result.valid) {
        toast.success('Accès AI autorisé');
        setPassword('');
        setAttempts(0);
        onOpenChange(false);
        onSuccess();
      } else if (result.blocked) {
        // User is blocked
        toast.error(result.error || 'Votre accès IA a été bloqué par l\'administrateur.');
        onOpenChange(false);
        setPassword('');
      } else {
        setAttempts(prev => prev + 1);
        toast.error(`Mot de passe incorrect (${3 - attempts - 1} tentatives restantes)`);
        
        if (attempts >= 2) {
          toast.error('Trop de tentatives. Réessayez plus tard.');
          onOpenChange(false);
          setAttempts(0);
        }
      }
    } catch (error: any) {
      toast.error('Erreur de validation');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Brain className="w-5 h-5 text-primary" />
            Accès AI Protégé
          </DialogTitle>
          <DialogDescription>
            Entrez le mot de passe pour utiliser les fonctionnalités d'analyse IA.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ai-password" className="text-foreground">
              Mot de passe AI
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="ai-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 bg-muted/50 border-border"
                placeholder="Entrez le mot de passe"
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isValidating}
              className="bg-primary hover:bg-primary/90"
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Vérification...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Valider
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

