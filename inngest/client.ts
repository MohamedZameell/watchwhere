import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "watchwhere",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
