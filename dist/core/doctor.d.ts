import { type ProjectInfo } from './projectDetector.js';
interface DoctorCheck {
    label: string;
    status: 'ok' | 'warn' | 'error';
    message: string;
}
/**
 * Run a health check on the project.
 */
export declare function runDoctor(cwd: string): DoctorCheck[];
/**
 * Print doctor results to the console.
 */
export declare function printDoctorResults(checks: DoctorCheck[], project: ProjectInfo): void;
export {};
//# sourceMappingURL=doctor.d.ts.map