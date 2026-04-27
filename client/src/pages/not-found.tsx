import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            The page you are looking for is unavailable or may have moved.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/">
              <Button size="sm">Go Home</Button>
            </Link>
            <Link href="/auth/login">
              <Button size="sm" variant="outline">Sign In</Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="sm" variant="outline">Create Account</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
