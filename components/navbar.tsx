"use client";
import { Button } from "@/components/ui/button";
import { Trophy, Settings } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";

export default function Navbar() {
  const { user } = useAuth();

  return (
    <div className="flex items-center justify-between container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold flex items-center justify-center gap-2">
          <Trophy className="h-8 w-8" />
          Triathlon Calculator
        </h1>
        <p className="text-gray-600">
          Track your athletes&apos; progress during triathlon races
        </p>
      </div>
      <div className="flex items-end">
        {user ? (
          <></>
        ) : (
          <Link href="/login">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Log in
            </Button>
          </Link>
        )}
        {user?.user_metadata?.admin && (
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Admin
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
