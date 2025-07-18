import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export function HelpAccordion() {
  const DataFrequency = 
`Stock prices and VN-Index are updated at 4 pm, MYR/VND exchange rate are updated at 8 pm, from Monday to Friday automatically.

Stock prices can be updated manually via "Refresh" button on "Holdings" page. No manual update available for VN-Index and exchange rates.

Performance-related data will be refresh every hour from 9:30 am to 8:30 pm from Monday to Friday. Due to caching duration of 1 hour, sometimes asset-related data can be slightly delayed up to 1 hour.`

  const ImportReq =
`Historical transaction data can be imported from a .csv file with the following column headers in exact order:

date
type
account
asset_ticker
cash_asset_ticker
quantity
price
fees
taxes
counterparty
interest_rate
principal
interest
description

For the meaning of each column, take a look at "Add Transaction" dialog to see how input fields correspond to each transaction type to have an idea of how it works`

  const InitializeData =
`To reduce calculation load on database, a snapshot of performance data will be generated daily, and most performance data will be retrieved from this snapshot table. Newly imported historical data will need to generate this table before performance data can be displayed.

To generate performance snapshots data, go to "Settings" page. Existing performance snapshots data can be recalculated as well to reflect the latest value instead of waiting for the next refresh.`

  return (
    <Accordion
      type="single"
      collapsible
      className="w-full font-thin"
      defaultValue="item-1"
    >
      <AccordionItem value="item-1">
        <AccordionTrigger>Data update frequency</AccordionTrigger>
        <AccordionContent className="whitespace-pre-wrap">
          {DataFrequency}
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Requirements for importing data</AccordionTrigger>
        <AccordionContent className="whitespace-pre-wrap">
          {ImportReq}
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>Initialize performance data</AccordionTrigger>
        <AccordionContent className="whitespace-pre-wrap">
          {InitializeData}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
