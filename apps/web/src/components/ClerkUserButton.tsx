import { UserButton } from '@clerk/clerk-react';

export function ClerkUserButton() {
  return (
    <UserButton 
      afterSignOutUrl="/login"
      appearance={{
        elements: {
          avatarBox: "w-10 h-10",
        }
      }}
      showName
    />
  );
}
