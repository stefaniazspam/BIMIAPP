import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardContent className="pt-6 pb-6 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold font-display text-gray-900">Pagina non trovata</h1>
          <p className="text-gray-500">
            Ops! Sembra che tu ti sia persa. Torna alla home per ritrovare la strada.
          </p>
          <Link href="/">
            <Button className="w-full mt-4 bg-primary text-white hover:bg-primary/90">
              Torna alla Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
