import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, AlertTriangle, CheckCircle } from "lucide-react";

interface Props {
  settlement: string;
}

interface Equipment {
  id: string;
  item_name: string;
  item_type: string;
  expected_quantity: number;
  actual_quantity: number;
  notes: string | null;
}

export function EquipmentTab({ settlement }: Props) {
  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("hagmar_equipment")
        .select("id, item_name, item_type, expected_quantity, actual_quantity, notes")
        .eq("settlement", settlement);
      setItems(data || []);
      setLoading(false);
    };
    fetch();
  }, [settlement]);

  if (loading) {
    return <div className="flex justify-center py-10"><div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" /></div>;
  }

  const shortages = items.filter(i => i.actual_quantity < i.expected_quantity);
  const surplus = items.filter(i => i.actual_quantity > i.expected_quantity);
  const ok = items.filter(i => i.actual_quantity === i.expected_quantity);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-emerald-900/20 border-emerald-800">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-black text-emerald-400">{ok.length}</p>
            <p className="text-xs text-slate-400">תקין</p>
          </CardContent>
        </Card>
        <Card className="bg-red-900/20 border-red-800">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-black text-red-400">{shortages.length}</p>
            <p className="text-xs text-slate-400">חוסר</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-900/20 border-amber-800">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-black text-amber-400">{surplus.length}</p>
            <p className="text-xs text-slate-400">עודף</p>
          </CardContent>
        </Card>
      </div>

      {/* Items List */}
      <div className="space-y-2">
        {items.map(item => {
          const diff = item.actual_quantity - item.expected_quantity;
          const status = diff === 0 ? "ok" : diff < 0 ? "shortage" : "surplus";
          return (
            <Card key={item.id} className={`border ${
              status === "ok" ? "bg-slate-800 border-slate-700" :
              status === "shortage" ? "bg-red-900/10 border-red-800/50" : "bg-amber-900/10 border-amber-800/50"
            }`}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-white">{item.item_name}</span>
                  {item.notes && <p className="text-xs text-slate-500">{item.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">
                    {item.actual_quantity}/{item.expected_quantity}
                  </span>
                  {status === "ok" ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : status === "shortage" ? (
                    <Badge className="bg-red-600 text-white border-0 text-xs">-{Math.abs(diff)}</Badge>
                  ) : (
                    <Badge className="bg-amber-600 text-white border-0 text-xs">+{diff}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {items.length === 0 && (
          <p className="text-center text-slate-500 py-8">לא נמצאו פריטי ציוד</p>
        )}
      </div>
    </div>
  );
}