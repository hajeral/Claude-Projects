// P15 Terms & conditions
import React from 'react';
import { Policy } from '../components/Policy';

export default function Terms() {
  return (
    <Policy
      title="Terms & conditions"
      updated="Last updated 1 November 2026 · 4 min read"
      toc={['Surprise bags', 'Pickup', 'Payments', 'Refunds', 'Your account']}
      sections={[
        { h: 'Surprise bags', p: 'Every bag is a surprise, filled with what the shop has available that day, so contents vary. Bags are offered at 50–70% below the usual value.' },
        { h: 'Pickup', p: 'Collect your bag in the pickup window shown on your Pickup passport. WonderBites is pickup only, there is no delivery.' },
        { h: 'Payments', p: 'You pay in the app when you reserve. A small service fee is shown before you pay.' },
        { h: 'Cancellations', p: 'You can cancel for free up to 2 hours before your pickup window opens.' },
        { h: 'Refunds', p: 'If a shop can’t give you your bag, you get a full refund. Report a problem from your Pickup passport.' },
        { h: 'Your account', p: 'Keep your login details private. We may pause accounts that misuse vouchers or repeatedly miss pickups.' },
      ]}
    />
  );
}
