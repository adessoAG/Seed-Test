/**
 * Interface of the step type
 */
export interface StepType {
    /**
     * Object id of the step type in the database
     */
    _id?: string;

    /**
     * Importance of the step type, the lower, the higher the importance -> the higher the step is the higher ordered it is in the list of available steps
     */
    id: number;

    /**
     * Text before the first input field
     */
    pre: string

    /**
     * Text after the first input field
     */
    mid: string;

    /**
     * Selection currently not used
     */
    selection?: string[];

    /**
     * Name of the type to which this step belongs to: given, when, then
     */
    stepType: string;

    /**
     * Name shown to the user in the available steps list
     */
    type: string;

    /**
     * List of values to fill the input fields
     */
    values: string[];

    /**
     * Outdated currently not used
     */
    outdated?: boolean;

    /**
     * checked currently not used
     */
    checked?: boolean;

    /**
     * deactivated currently not used
     */
    deactivated?: boolean;
}