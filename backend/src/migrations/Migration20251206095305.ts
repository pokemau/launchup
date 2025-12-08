import { Migration } from '@mikro-orm/migrations';

export class Migration20251206095305 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "assessment_fields" ("id" serial primary key, "assessment_id" int not null, "description" text not null, "answer_type" smallint not null, "order" int not null default 0);`);

    this.addSql(`alter table "assessment_fields" add constraint "assessment_fields_assessment_id_foreign" foreign key ("assessment_id") references "assessments" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "startup_responses" drop constraint "startup_responses_assessment_id_foreign";`);

    this.addSql(`alter table "assessments" drop column "answer_type";`);

    this.addSql(`alter table "assessments" rename column "description" to "name";`);

    this.addSql(`alter table "startup_responses" add column "file_url" varchar(255) null, add column "file_name" varchar(255) null;`);
    this.addSql(`alter table "startup_responses" rename column "assessment_id" to "assessment_field_id";`);
    this.addSql(`alter table "startup_responses" add constraint "startup_responses_startup_id_foreign" foreign key ("startup_id") references "startups" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "startup_responses" add constraint "startup_responses_assessment_field_id_foreign" foreign key ("assessment_field_id") references "assessment_fields" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "startup_assessments" drop column "assessment_type";`);

    this.addSql(`alter table "startup_assessments" add column "assessment_id" int not null, add column "assigned_at" timestamptz not null, add column "completed_at" timestamptz null;`);
    this.addSql(`alter table "startup_assessments" add constraint "startup_assessments_assessment_id_foreign" foreign key ("assessment_id") references "assessments" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "startup_responses" drop constraint "startup_responses_assessment_field_id_foreign";`);

    this.addSql(`drop table if exists "assessment_fields" cascade;`);

    this.addSql(`alter table "startup_responses" drop constraint "startup_responses_startup_id_foreign";`);

    this.addSql(`alter table "startup_assessments" drop constraint "startup_assessments_assessment_id_foreign";`);

    this.addSql(`alter table "assessments" add column "answer_type" smallint not null;`);
    this.addSql(`alter table "assessments" rename column "name" to "description";`);

    this.addSql(`alter table "startup_responses" drop column "file_url", drop column "file_name";`);

    this.addSql(`alter table "startup_responses" rename column "assessment_field_id" to "assessment_id";`);
    this.addSql(`alter table "startup_responses" add constraint "startup_responses_assessment_id_foreign" foreign key ("assessment_id") references "assessments" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "startup_assessments" drop column "assessment_id", drop column "assigned_at", drop column "completed_at";`);

    this.addSql(`alter table "startup_assessments" add column "assessment_type" text check ("assessment_type" in ('Technology', 'Acceptance', 'Market', 'Regulatory', 'Organizational', 'Investment')) not null;`);
  }

}
