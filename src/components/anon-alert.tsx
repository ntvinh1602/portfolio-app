import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface AnonRestrictionProps {
  showAuthAlert: boolean
  setShowAuthAlert: (open: boolean) => void
}

export function AnonRestriction({ showAuthAlert, setShowAuthAlert }: AnonRestrictionProps) {
  return (
    <Dialog open={showAuthAlert} onOpenChange={setShowAuthAlert}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{"You're not logged in"}</DialogTitle>
          <DialogDescription>
            This feature is only available for registered user.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => setShowAuthAlert(false)}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
