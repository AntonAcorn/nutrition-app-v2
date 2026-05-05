ALTER TABLE auth_accounts ADD COLUMN apple_id VARCHAR(255);
CREATE UNIQUE INDEX uq_auth_accounts_apple_id ON auth_accounts(apple_id) WHERE apple_id IS NOT NULL;
