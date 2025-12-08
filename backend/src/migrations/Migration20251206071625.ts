import { Migration } from '@mikro-orm/migrations';

export class Migration20251206071625 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "assessments" drop constraint "assessments_assessment_type_id_foreign";`);

    this.addSql(`alter table "startup_assessments" drop constraint "startup_assessments_assessment_type_id_foreign";`);

    this.addSql(`drop table if exists "assessment_types" cascade;`);

    this.addSql(`alter table "assessments" drop column "assessment_type_id";`);

    this.addSql(`alter table "assessments" add column "assessment_type" text check ("assessment_type" in ('Technology', 'Acceptance', 'Market', 'Regulatory', 'Organizational', 'Investment')) not null;`);

    this.addSql(`alter table "startup_assessments" drop column "assessment_type_id";`);

    this.addSql(`alter table "startup_assessments" add column "assessment_type" text check ("assessment_type" in ('Technology', 'Acceptance', 'Market', 'Regulatory', 'Organizational', 'Investment')) not null;`);
    this.addSql(`alter table "startup_assessments" add constraint "startup_assessments_startup_id_foreign" foreign key ("startup_id") references "startups" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`create table "assessment_types" ("id" serial primary key, "type" varchar(255) not null);`);

    this.addSql(`alter table "startup_assessments" drop constraint "startup_assessments_startup_id_foreign";`);

    this.addSql(`alter table "assessments" drop column "assessment_type";`);

    this.addSql(`alter table "assessments" add column "assessment_type_id" int not null;`);
    this.addSql(`alter table "assessments" add constraint "assessments_assessment_type_id_foreign" foreign key ("assessment_type_id") references "assessment_types" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "startup_assessments" drop column "assessment_type";`);

    this.addSql(`alter table "startup_assessments" add column "assessment_type_id" int not null;`);
    this.addSql(`alter table "startup_assessments" add constraint "startup_assessments_assessment_type_id_foreign" foreign key ("assessment_type_id") references "assessment_types" ("id") on update cascade on delete cascade;`);
  }

}
