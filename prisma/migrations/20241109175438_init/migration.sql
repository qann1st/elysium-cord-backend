-- AlterTable
CREATE SEQUENCE role_order_seq;
ALTER TABLE "Role" ALTER COLUMN "order" SET DEFAULT nextval('role_order_seq');
ALTER SEQUENCE role_order_seq OWNED BY "Role"."order";
