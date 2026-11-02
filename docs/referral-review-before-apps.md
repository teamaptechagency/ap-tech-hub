# Referral review before app rollout

Partners can view their own commission ledger at /r/commission, USD available/pending/withdrawable summaries, entries in original currencies and the current agreed rate. The same page now accepts project-specific agreement requests: Commission (10%–20%, agency payout or partner retention) or Custom Margin (AP Tech quote + client price, partner retains the difference). Requests are partner-scoped; admin reviews at /referrals. Approval records written terms, not a financial transfer. Accounts must reconcile the referenced invoice/collection; no commission and margin double payout is generated automatically.

Review finding: the old ORIGINAL/DISCOUNTED automation could calculate full invoice commission again on each instalment, and NET/MANUAL were not explicitly excluded. Automatic accrual is now RECEIVED only and bounded to the received amount; other bases require explicit manual calculation. Existing saved commission entries and rates are unchanged. Reseller mode continues to skip automatic percentage commission. Partner model/basis inputs are validated against known values.

Tests cover partner isolation, rejection of self-approval, active-account checks, USD-only balance arithmetic, and instalment accrual. Full production build passes. This checkpoint is pushed before starting the Android/client desktop work as requested.
