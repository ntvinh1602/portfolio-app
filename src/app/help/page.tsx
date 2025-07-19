import {
  PageMain,
  PageHeader,
  PageContent,
} from "@/components/page-layout"
import { HelpAccordion } from "@/components/help-accordion"
import { BottomNavBar } from "@/components/menu/bottom-nav"

export default function Page() {

  return (
    <PageMain>
      <PageHeader title="Help" />
      <PageContent>
        <HelpAccordion />
      </PageContent>
      <BottomNavBar />
    </PageMain>
  )
}
