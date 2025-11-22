import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreatedOperator {
  id: string;
  full_name: string;
  employee_id: string;
  role: string;
}

export function OperatorCreationForm() {
  const [fullName, setFullName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdOperators, setCreatedOperators] = useState<CreatedOperator[]>([]);

  const generateEmployeeId = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `OPR-${timestamp}`;
  };

  const handleCreateOperator = async () => {
    // Validation
    if (!fullName.trim()) {
      toast.error('Please enter operator name');
      return;
    }

    if (!pin || pin.length < 4 || pin.length > 6) {
      toast.error('PIN must be 4-6 digits');
      return;
    }

    if (!/^\d+$/.test(pin)) {
      toast.error('PIN must contain only numbers');
      return;
    }

    if (pin !== confirmPin) {
      toast.error('PINs do not match');
      return;
    }

    const finalEmployeeId = employeeId.trim() || generateEmployeeId();

    setCreating(true);

    try {
      const { data, error } = await supabase.rpc('create_operator_with_pin', {
        p_full_name: fullName,
        p_employee_id: finalEmployeeId,
        p_pin: pin,
        p_role: 'operator',
      });

      if (error) throw error;

      toast.success(`Operator created: ${finalEmployeeId}`);

      // Add to created operators list
      setCreatedOperators([
        ...createdOperators,
        {
          id: data,
          full_name: fullName,
          employee_id: finalEmployeeId,
          role: 'operator',
        },
      ]);

      // Reset form
      setFullName('');
      setEmployeeId('');
      setPin('');
      setConfirmPin('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create operator');
      console.error('Error creating operator:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Creation Form */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Create Operator (No Email Required)</h3>
        <p className="text-sm text-muted-foreground">
          Create operators for shop floor workers who don't need email login. They'll use Employee ID + PIN.
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              placeholder="John Smith"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="employeeId">
              Employee ID{' '}
              <span className="text-muted-foreground text-xs">(auto-generated if empty)</span>
            </Label>
            <Input
              id="employeeId"
              placeholder="OPR-123456"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pin">PIN (4-6 digits) *</Label>
              <div className="relative">
                <Input
                  id="pin"
                  type={showPin ? 'text' : 'password'}
                  placeholder="1234"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  maxLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPin(!showPin)}
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPin">Confirm PIN *</Label>
              <Input
                id="confirmPin"
                type={showPin ? 'text' : 'password'}
                placeholder="1234"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                maxLength={6}
              />
            </div>
          </div>

          <Button
            onClick={handleCreateOperator}
            disabled={creating}
            className="gap-2"
          >
            {creating && <Loader2 className="h-4 w-4 animate-spin" />}
            <UserPlus className="h-4 w-4" />
            Create Operator
          </Button>
        </div>
      </div>

      {/* Created Operators List */}
      {createdOperators.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Created Operators</h3>

          <div className="space-y-2">
            {createdOperators.map((operator) => (
              <Card key={operator.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{operator.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Employee ID: {operator.employee_id}
                    </p>
                  </div>
                  <Badge variant="secondary">{operator.role}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
