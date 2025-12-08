import { Module } from '@nestjs/common';
import { AssessmentController } from './assessment.controller';
import { StartupAssessmentController } from './startup-assessment.controller';
import { AssessmentService } from './assessment.service';

@Module({
  controllers: [AssessmentController, StartupAssessmentController],
  providers: [AssessmentService],
})
export class AssessmentModule {}
