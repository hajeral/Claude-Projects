// Help centre articles. In live mode these can come from the CMS; the ids stay the same.
export type Article = { id: string; cat: 'Orders' | 'Pickup' | 'Payments' | 'Account'; title: string; intro: string; steps: string[] };
export const ARTICLES: Article[] = [
  { id: 'closed', cat: 'Pickup', title: 'The shop was closed at my pickup time', intro: '', steps: [] }, // written out in the article screen
  { id: 'cancel', cat: 'Orders', title: 'How do I cancel or change my order?', intro: 'You can cancel for free up to 2 hours before your pickup window opens. The bag goes back on sale and you get a full refund.',
    steps: ['Open My orders and find the order under Upcoming.', 'Tap Cancel reservation, then tap again to confirm.', 'To change the quantity, cancel and reserve again while bags are still available.'] },
  { id: 'late', cat: 'Pickup', title: 'I’m late for my pickup. What now?', intro: 'Shops hold your bag until the end of your pickup window. After that, the shop may close or pass the food on.',
    steps: ['If you’re running late, call the shop from your Pickup passport.', 'If you missed the window, open a ticket and tell us what happened.', 'Late pickups are not refunded unless the shop agreed to wait.'] },
  { id: 'inside', cat: 'Orders', title: 'What might I find in a surprise bag?', intro: 'Each bag is filled with good food the shop still has at the end of the day, so what’s inside changes daily. The shop chooses the bag type, such as bread and pastries or meals.',
    steps: ['The bag’s page shows the type, what it usually contains and the allergens.', 'What’s inside is worth more than you pay, with 50–70% savings.', 'Rate your bag after pickup to help others find their favourites.'] },
  { id: 'prices', cat: 'Payments', title: 'How are prices and discounts set?', intro: 'Each shop sets its own price, the original value and the number of bags. WonderBites shows them exactly as the shop sets them.',
    steps: ['Savings are between 50% and 70% of the usual value.', 'A small service fee is added at checkout and shown before you pay.', 'Vouchers take money off the total; one voucher per order.'] },
  { id: 'allergy', cat: 'Orders', title: 'I have an allergy or dietary need', intro: 'Because bags are a surprise, shops can’t promise exactly what’s inside. Each bag lists its usual allergens.',
    steps: ['Use the Dietary preference filter to find vegetarian or vegan bags.', 'Check the allergens on the bag’s page before you reserve.', 'If you have a severe allergy, ask the shop about ingredients before you eat anything. Surprise bags may not be right for you.'] },
  { id: 'refunds', cat: 'Payments', title: 'When and how do I get a refund?', intro: 'Refunds go back to the card or wallet you paid with, usually within 3–5 working days.',
    steps: ['Cancelled in time: full refund, service fee included.', 'Shop closed or bag missing: open a ticket and we refund in full.', 'You’ll see the refund in My orders under Cancelled.'] },
];
export const findArticle = (id?: string) => ARTICLES.find((a) => a.id === id);
