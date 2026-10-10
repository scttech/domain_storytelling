// Tutorial content. Each step loads `text` into the editor and shows `body` in a card next to it.
// `done(model)` (optional) turns the step's "Your turn" task green when satisfied; `highlight` is a CSS selector.

export const TUTORIALS = [
  {
    id: 'basics',
    title: '1. Your first domain story',
    summary: 'Actors, work objects and the sentences that connect them.',
    steps: [
      {
        title: 'Actors and work objects',
        body: `<p>A <strong>domain story</strong> is told from the point of view of the people and systems involved. We start by naming them.</p>
          <ul><li><code>actor</code> — a person or role</li><li><code>system</code> — software or a machine</li><li><code>object</code> — a <em>work object</em>: something that is handed over or worked on</li></ul>
          <p>The name in square brackets picks an icon.</p>`,
        task: 'Change an icon, e.g. <code>[user]</code> to <code>[user-cog]</code>. Browse the names under Help → Icons.',
        highlight: '#editor',
        text: `title Ordering a Pizza

actor Customer [user]
actor Cashier [user-circle]
object Pizza [pizza]
`,
      },
      {
        title: 'The first sentence',
        body: `<p>Each sentence is one <strong>activity</strong>. It reads like English: <em>who</em> does <em>what</em> with which work object, and to <em>whom</em>.</p>
          <p><code>Customer orders Pizza from Cashier</code> draws an arrow from Customer to Cashier. The Pizza icon rides on the arrow because it is what the activity is about. The badge shows the step number.</p>`,
        task: 'Change the verb to <code>asks for</code>.',
        highlight: '#editor',
        text: `title Ordering a Pizza

actor Customer [user]
actor Cashier [user-circle]
object Pizza [pizza]

Customer orders Pizza from Cashier
`,
      },
      {
        title: 'Working on an object',
        body: `<p>If an actor works <em>on</em> an object, leave out the second actor. The arrow then points at the object node: <code>Cook bakes Pizza</code>.</p>
          <p>Steps are numbered automatically, in the order the sentences appear in the text.</p>`,
        task: 'Add <code>Cook serves Pizza to Customer</code> as the last sentence.',
        highlight: '#editor',
        done: (m) => m.steps.length >= 4 && m.errors.length === 0,
        text: `title Ordering a Pizza

actor Customer [user]
actor Cashier [user-circle]
actor Cook [chef-hat]
object Pizza [pizza]

Customer orders Pizza from Cashier
Cashier passes Pizza to Cook
Cook bakes Pizza
`,
      },
      {
        title: 'Move things around',
        body: `<p>Drag an actor or object on the canvas. The editor text records the position as <code>@ x,y</code>, so the layout is saved with the story, in the share link and in exports.</p>
          <p>Scroll to zoom, drag the background to pan, and use <strong>Fit</strong> to see everything.</p>`,
        task: 'Drag any node and watch the text change.',
        highlight: '#canvas',
        done: (m) => m.nodes.some((n) => n.hasPos),
        text: `title Ordering a Pizza

actor Customer [user]
actor Cashier [user-circle]
actor Cook [chef-hat]
object Pizza [pizza]

Customer orders Pizza from Cashier
Cashier passes Pizza to Cook
Cook bakes Pizza
Cook serves Pizza to Customer
`,
      },
    ],
  },
  {
    id: 'numbering',
    title: '2. Numbering and parallel steps',
    summary: 'Control the order and show things that happen at the same time.',
    steps: [
      {
        title: 'Automatic numbers',
        body: `<p>Without any help the numbers simply count up in text order. Reorder two sentences and the badges renumber.</p>`,
        task: 'Swap the last two sentences.',
        highlight: '#editor',
        text: `title Hiring

actor Candidate [user]
actor Recruiter [user-check]
object CV [file-text]
object Offer [certificate]

Candidate sends CV to Recruiter
Recruiter screens CV
Recruiter sends Offer to Candidate
`,
      },
      {
        title: 'Your own numbers',
        body: `<p>Start a line with <code>3.</code> to fix its number. Later sentences continue from there. This helps when you want to leave room for steps you will add later.</p>`,
        task: 'Change a number and see the following ones continue from it.',
        highlight: '#editor',
        text: `title Hiring

actor Candidate [user]
actor Recruiter [user-check]
object CV [file-text]
object Offer [certificate]

1. Candidate sends CV to Recruiter
2. Recruiter screens CV
10. Recruiter sends Offer to Candidate
Candidate signs Offer
`,
      },
      {
        title: 'Parallel steps',
        body: `<p>When two things happen at the same time, add a letter: <code>3a.</code> and <code>3b.</code>. The next plain sentence continues with 4.</p>`,
        task: 'Add <code>3c. Recruiter updates Calendar</code> (you will need to declare <code>object Calendar [calendar]</code>).',
        highlight: '#editor',
        text: `title Onboarding

actor Recruiter [user-check]
actor Manager [user-cog]
actor Employee [user]
system HR System [database]
object Contract [file-check]

1. Recruiter sends Contract to Employee
2. Employee returns Contract to Recruiter
3a. Recruiter registers Contract in HR System
3b. Recruiter notifies Manager
4. Manager welcomes Employee
`,
      },
    ],
  },
  {
    id: 'groups',
    title: '3. Groups, notes and assumptions',
    summary: 'Show boundaries, annotate the diagram and record assumptions.',
    steps: [
      {
        title: 'Groups',
        body: `<p><code>group Kitchen: Cook, Oven</code> draws a box around the listed names — a department, a team or a system boundary. The box follows its members when you drag them.</p>`,
        task: 'Add <code>Waiter</code> to the group.',
        highlight: '#editor',
        text: `title Restaurant

actor Guest [user]
actor Waiter [user-circle]
actor Cook [chef-hat]
system Oven [tools-kitchen-2]
object Meal [pizza]

group Kitchen: Cook, Oven

Guest orders Meal from Waiter
Waiter passes Meal to Cook
Cook cooks Meal in Oven
Waiter serves Meal to Guest
`,
      },
      {
        title: 'Notes',
        body: `<p>Notes capture assumptions, questions and pain points. <code>note Text -> Name</code> attaches one to a name; leave off <code>-> Name</code> for a free-floating one. Notes can be dragged too.</p>`,
        task: 'Add another note: <code>note Guests wait too long -> Guest</code>.',
        highlight: '#editor',
        text: `title Restaurant

actor Guest [user]
actor Waiter [user-circle]
actor Cook [chef-hat]
object Meal [pizza]

Guest orders Meal from Waiter
Waiter passes Meal to Cook
Cook cooks Meal
Waiter serves Meal to Guest

note Orders are written on paper -> Waiter
`,
      },
      {
        title: 'Assumptions and comments',
        body: `<p>Notes sit on the diagram. For statements about the <em>whole</em> story, use an <code>assumptions</code> or <code>comments</code> block. Each item starts with <code>-</code>, and the block ends with a line containing only <code>}</code>.</p>
          <p>They appear in the side panel as <strong>A1, A2…</strong> and <strong>C1, C2…</strong>. The toolbar buttons show or hide each list.</p>`,
        task: 'Add another <code>- …</code> item to the comments, then hide and show the lists.',
        highlight: '#btn-comments',
        done: (m) => m.comments.length >= 2 && m.errors.length === 0,
        text: `title Restaurant

actor Guest [user]
actor Waiter [user-circle]
object Meal [pizza]

Guest orders Meal from Waiter
Waiter serves Meal to Guest

assumptions {
- Guests always order at the table
- Payment happens after the meal
}

comments {
- Ask whether takeaway orders are in scope
}
`,
      },
    ],
  },
  {
    id: 'layout',
    title: '4. Layout, play-through and sharing',
    summary: 'Tidy up, present the story and send it to someone.',
    steps: [
      {
        title: 'Auto and force layout',
        body: `<p><strong>Auto layout</strong> clears positions and lines everything up left to right in story order. <strong>Force layout</strong> treats arrows like springs and lets the picture settle on its own; drag a node to pull its neighbours along. Turn it off to freeze the result.</p>`,
        task: 'Turn on <em>Force</em>, then drag a node.',
        highlight: '#btn-force',
        text: `title Online Shop

actor Customer [user]
actor Clerk [user-cog]
system Shop [world]
system Payments [credit-card]
system Warehouse [building]
object Cart [shopping-cart]
object Parcel [package]

Customer places Cart in Shop
Shop requests payment from Payments
Payments confirms payment to Shop
Shop notifies Warehouse
Clerk packs Parcel
Clerk ships Parcel to Customer
`,
      },
      {
        title: 'Play the story',
        body: `<p><strong>Play</strong> reveals the story one sentence at a time and shows the sentence in plain English. Use the arrows or the space bar, or press ▶ to auto-play. It is the best way to walk stakeholders through a story.</p>`,
        task: 'Press Play.',
        highlight: '#btn-play',
        text: `title Online Shop

actor Customer [user]
actor Clerk [user-cog]
system Shop [world]
system Payments [credit-card]
system Warehouse [building]
object Cart [shopping-cart]
object Parcel [package]

Customer places Cart in Shop
Shop requests payment from Payments
Payments confirms payment to Shop
Shop notifies Warehouse
Clerk packs Parcel
Clerk ships Parcel to Customer
`,
      },
      {
        title: 'Share and export',
        body: `<p><strong>Share</strong> copies a link containing the whole story (compressed) — no server needed. <strong>Export</strong> saves the story as text, SVG or PNG. Everything is stored in your browser as you work.</p>`,
        task: 'Try Share. The link is copied to your clipboard.',
        highlight: '#btn-share',
        text: `title Online Shop

actor Customer [user]
actor Shop [world]
object Cart [shopping-cart]

Customer places Cart in Shop
`,
      },
    ],
  },
];
