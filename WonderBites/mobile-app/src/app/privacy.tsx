// P14 Privacy policy
import React from 'react';
import { WALLET } from '../lib/platform';
import { Policy } from '../components/Policy';

export default function Privacy() {
  return (
    <Policy
      title="Privacy policy"
      updated="Last updated 1 November 2026 · 4 min read"
      toc={['What we collect', 'How we use it', 'Location', 'Payments', 'Your rights']}
      sections={[
        { h: 'What we collect', p: 'Your name, email and mobile number, the orders you place, the shops you favourite and, if you allow it, your approximate location.' },
        { h: 'How we use it', list: ['To reserve your bags and send your pickup PIN.', 'To show shops and bags near you.', 'To send the notifications you choose.', 'To keep your account secure.'] },
        { h: 'Location', p: 'We only use your location while you use the app, to show bags nearby. You can turn it off in your phone settings at any time.' },
        { h: 'Payments', p: `Card and ${WALLET} payments are handled by our licensed payment partner. We never store your full card number.` },
        { h: 'Sharing', p: 'We share your first name and order details with the shop you reserve from, so they can hand over your bag. We never sell your data.' },
        { h: 'Your rights', p: 'You can view, correct, download or delete your data from Account. Deleting your account removes your personal data within 30 days, except what the law asks us to keep.' },
      ]}
    />
  );
}
