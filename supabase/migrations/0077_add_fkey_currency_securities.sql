ALTER TABLE ONLY "public"."securities"
    ADD CONSTRAINT "securities_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code");