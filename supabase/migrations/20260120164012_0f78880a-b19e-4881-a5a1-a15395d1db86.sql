-- Add 100 test credits to agencevisitenow@gmail.com (user_id: dd389511-a4ba-480a-b36b-2e3384a25cfb)
INSERT INTO user_credits (user_id, credits_balance, total_purchased, total_used)
VALUES ('dd389511-a4ba-480a-b36b-2e3384a25cfb', 100, 100, 0)
ON CONFLICT (user_id) DO UPDATE SET 
  credits_balance = 100,
  total_purchased = user_credits.total_purchased + 100;

-- Ensure client role is assigned
INSERT INTO user_roles (user_id, role)
VALUES ('dd389511-a4ba-480a-b36b-2e3384a25cfb', 'client')
ON CONFLICT (user_id) DO NOTHING;