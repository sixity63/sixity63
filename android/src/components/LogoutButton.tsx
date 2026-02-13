import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface LogoutButtonProps {
  showText?: boolean;
}

export const LogoutButton = ({ showText = true }: LogoutButtonProps) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Gagal logout');
    } else {
      toast.success('Berhasil logout');
      navigate('/auth');
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      className="gap-2"
    >
      <LogOut className="h-4 w-4" />
      {showText && 'Logout'}
    </Button>
  );
};
