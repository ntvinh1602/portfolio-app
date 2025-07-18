import {
  PageMain,
  PageHeader,
  PageContent,
  BottomNavBar
} from "@/components/page-layout"
import { HelpAccordion } from "@/components/help-accordion"

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
