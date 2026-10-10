export const SAMPLES = [
  {
    id: 'pizza',
    name: 'Ordering a pizza (simple)',
    text: `title Ordering a Pizza

actor Customer [user] @ 100,240
actor Cashier [user-circle] @ 420,240
actor Cook [chef-hat] @ 740,400
system POS [device-desktop] @ 580,60
object Pizza [pizza] @ 980,400
object Order [clipboard-list]
object Receipt [receipt]

Customer orders Pizza from Cashier
Cashier enters Order into POS
POS prints Receipt for Cashier
Cashier hands Receipt to Customer
Cashier passes Order to Cook
Cook bakes Pizza
Cook serves Pizza to Customer

note Peak hours: Fri and Sat evenings @ 220,70 -> Cashier
`,
  },
  {
    id: 'shop',
    name: 'Online shop (groups, parallel steps)',
    text: `title Online Shop: Placing an Order

actor Customer [user] @ 100,300
actor Clerk [user-cog] @ 820,460
system Shop [world] @ 480,200
system Payments [credit-card] @ 480,-90
system Warehouse [building] @ 820,200
actor Courier [truck] @ 820,740
object Cart [shopping-cart]
object Invoice [file-invoice]
object Parcel [package] @ 1130,460

group Our company: Shop, Clerk, Warehouse

1. Customer places Cart in Shop
2. Shop requests payment from Payments
3. Payments confirms payment to Shop
4a. Shop creates Invoice for Customer
4b. Shop notifies Warehouse
5. Clerk packs Parcel
6. Clerk hands Parcel to Courier
7. Courier delivers Parcel to Customer

note 4a and 4b happen in parallel @ 760,-90 -> Shop

assumptions {
- Payment is confirmed before the warehouse is notified
- Only one parcel per order
}

comments {
- What happens when the payment provider is down?
}
`,
  },
  {
    id: 'claim',
    name: 'Insurance claim (as-is)',
    text: `title Insurance Claim (as-is)

actor Policyholder [user] @ 100,240
actor Agent [user-shield] @ 420,240
actor Assessor [user-check] @ 740,240
system Claims DB [database] @ 420,540
object Claim Form [forms]
object Photos [photo] @ 980,240
object Settlement [cash]

Policyholder sends Claim Form to Agent
Policyholder emails Photos to Agent
Agent registers Claim Form in Claims DB
Agent forwards Photos to Assessor
Assessor evaluates Photos
Assessor reports Settlement to Agent
Agent pays Settlement to Policyholder

note Takes 3 weeks on average @ 740,80 -> Assessor

assumptions {
- Every claim includes photos
- The agent registers the claim the same day
}
`,
  },
];

export const DEFAULT_SAMPLE = SAMPLES[0];
