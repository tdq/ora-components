export type Validator = (value: string) => string | null;

export const Validators = {
    required: (message: string = 'This field is required'): Validator => 
        (value: string) => value.trim() === '' ? message : null,
    
    minLength: (min: number, message: string = `Minimum length is ${min}`): Validator => 
        (value: string) => value.length < min ? message : null,
    
    maxLength: (max: number, message: string = `Maximum length is ${max}`): Validator => 
        (value: string) => value.length > max ? message : null,
    
    pattern: (regex: RegExp, message: string = 'Invalid format'): Validator => 
        (value: string) => regex.test(value) ? null : message,
    
    email: (message: string = 'Invalid email address'): Validator => 
        (value: string) => {
            if (!value) return null;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(value) ? null : message;
        }
};
