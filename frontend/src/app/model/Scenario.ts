import {StepDefinition} from './StepDefinition';


export interface Scenario {
    scenario_id: number;
    name: string;
    stepDefinitions: StepDefinition;
    comment: string;
    lastTestPassed?: boolean;
    saved?: boolean;
    daisyAutoLogout?: boolean;
    stepWaitTime?: number;
    browser?: string;
}
