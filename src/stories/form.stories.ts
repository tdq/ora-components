import { TextFieldStyle } from '../components/text-field';
import { BehaviorSubject, combineLatest, of, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { FormBuilder } from '../components/form';

export default {
    title: 'Examples/Forms',
};

export const PersonInformationForm = () => {
    // Form state
    const firstName$ = new BehaviorSubject('');
    const lastName$ = new BehaviorSubject('');
    const email$ = new BehaviorSubject('');
    const phone$ = new BehaviorSubject('');

    // Validation errors
    const firstNameError$ = firstName$.pipe(
        map(val => val.trim() === '' ? 'First name is required' : '')
    );

    const lastNameError$ = lastName$.pipe(
        map(val => val.trim() === '' ? 'Last name is required' : '')
    );

    const emailError$ = email$.pipe(
        map(val => {
            if (val.trim() === '') return 'Email is required';
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Invalid email format';
            return '';
        })
    );

    const phoneError$ = phone$.pipe(
        map(val => {
            if (val.trim() === '') return '';
            if (!/^\+?[\d\s\-()]+$/.test(val)) return 'Invalid phone format';
            return '';
        })
    );

    // Form validity
    const isFormValid$ = combineLatest([
        firstNameError$,
        lastNameError$,
        emailError$,
        phoneError$
    ]).pipe(
        map(errors => errors.every(error => error === ''))
    );

    // Form actions
    const submitClick$ = new Subject<void>();
    const resetClick$ = new Subject<void>();

    submitClick$.subscribe(() => {
        if (firstName$.value.trim() && lastName$.value.trim() &&
            email$.value.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email$.value)) {
            alert(`Form submitted!\n\nName: ${firstName$.value} ${lastName$.value}\nEmail: ${email$.value}\nPhone: ${phone$.value || 'N/A'}`);
        }
    });

    resetClick$.subscribe(() => {
        firstName$.next('');
        lastName$.next('');
        email$.next('');
        phone$.next('');
    });

    const form = new FormBuilder()
        .withCaption(of('Person Information'));

    const fields = form.withFields();
    fields.addTextField()
        .withLabel(of('First Name'))
        .withPlaceholder(of('Enter your first name'))
        .withValue(firstName$)
        .withError(firstNameError$)
        .withStyle(of(TextFieldStyle.FILLED));

    fields.addTextField()
        .withLabel(of('Last Name'))
        .withPlaceholder(of('Enter your last name'))
        .withValue(lastName$)
        .withError(lastNameError$)
        .withStyle(of(TextFieldStyle.FILLED));

    fields.addTextField()
        .withLabel(of('Email'))
        .withPlaceholder(of('example@domain.com'))
        .withValue(email$)
        .withError(emailError$)
        .withStyle(of(TextFieldStyle.FILLED));

    fields.addTextField()
        .withLabel(of('Phone (Optional)'))
        .withPlaceholder(of('+1 (555) 123-4567'))
        .withValue(phone$)
        .withError(phoneError$)
        .withStyle(of(TextFieldStyle.FILLED));

    const toolbar = form.withToolbar();
    toolbar.addSecondaryButton()
        .withCaption(of('Reset'))
        .withClick(resetClick$);
    
    toolbar.withPrimaryButton()
        .withCaption(of('Submit'))
        .withEnabled(isFormValid$)
        .withClick(submitClick$);

    const container = form.build();
    container.classList.add('p-4', 'max-w-md');

    return container;
};

export const AddressForm = () => {
    // Form state
    const street$ = new BehaviorSubject('');
    const city$ = new BehaviorSubject('');
    const state$ = new BehaviorSubject('');
    const zipCode$ = new BehaviorSubject('');
    const country$ = new BehaviorSubject('');

    // Validation errors
    const streetError$ = street$.pipe(
        map(val => val.trim() === '' ? 'Street address is required' : '')
    );

    const cityError$ = city$.pipe(
        map(val => val.trim() === '' ? 'City is required' : '')
    );

    const stateError$ = state$.pipe(
        map(val => val.trim() === '' ? 'State/Province is required' : '')
    );

    const zipCodeError$ = zipCode$.pipe(
        map(val => {
            if (val.trim() === '') return 'ZIP/Postal code is required';
            if (!/^[\d\-\s]+$/.test(val)) return 'Invalid ZIP code format';
            return '';
        })
    );

    const countryError$ = country$.pipe(
        map(val => val.trim() === '' ? 'Country is required' : '')
    );

    // Form validity
    const isFormValid$ = combineLatest([
        streetError$,
        cityError$,
        stateError$,
        zipCodeError$,
        countryError$
    ]).pipe(
        map(errors => errors.every(error => error === ''))
    );

    // Form actions
    const submitClick$ = new Subject<void>();
    const clearClick$ = new Subject<void>();

    submitClick$.subscribe(() => {
        if (street$.value.trim() && city$.value.trim() &&
            state$.value.trim() && zipCode$.value.trim() && country$.value.trim()) {
            alert(`Address submitted!\n\n${street$.value}\n${city$.value}, ${state$.value} ${zipCode$.value}\n${country$.value}`);
        }
    });

    clearClick$.subscribe(() => {
        street$.next('');
        city$.next('');
        state$.next('');
        zipCode$.next('');
        country$.next('');
    });

    const form = new FormBuilder()
        .withCaption(of('Address Information'));

    const fields = form.withFields(2);
    
    fields.addTextField(1, 2)
        .withLabel(of('Street Address'))
        .withPlaceholder(of('123 Main Street'))
        .withValue(street$)
        .withError(streetError$)
        .withStyle(of(TextFieldStyle.OUTLINED));

    fields.addTextField(1, 1)
        .withLabel(of('City'))
        .withPlaceholder(of('New York'))
        .withValue(city$)
        .withError(cityError$)
        .withStyle(of(TextFieldStyle.OUTLINED));

    fields.addTextField(2, 1)
        .withLabel(of('State/Province'))
        .withPlaceholder(of('NY'))
        .withValue(state$)
        .withError(stateError$)
        .withStyle(of(TextFieldStyle.OUTLINED));

    fields.addTextField(1, 1)
        .withLabel(of('ZIP/Postal Code'))
        .withPlaceholder(of('10001'))
        .withValue(zipCode$)
        .withError(zipCodeError$)
        .withStyle(of(TextFieldStyle.OUTLINED));

    fields.addTextField(2, 1)
        .withLabel(of('Country'))
        .withPlaceholder(of('United States'))
        .withValue(country$)
        .withError(countryError$)
        .withStyle(of(TextFieldStyle.OUTLINED));

    const toolbar = form.withToolbar();
    toolbar.addTextButton()
        .withCaption(of('Clear'))
        .withClick(clearClick$);
    
    toolbar.withPrimaryButton()
        .withCaption(of('Save Address'))
        .withEnabled(isFormValid$)
        .withClick(submitClick$);

    const container = form.build();
    container.classList.add('p-4', 'max-w-2xl');

    return container;
};

export const CombinedForm = () => {
    // Person Information State
    const firstName$ = new BehaviorSubject('');
    const lastName$ = new BehaviorSubject('');
    const email$ = new BehaviorSubject('');

    // Address State
    const street$ = new BehaviorSubject('');
    const city$ = new BehaviorSubject('');
    const zipCode$ = new BehaviorSubject('');

    // Validation
    const firstNameError$ = firstName$.pipe(
        map(val => val.trim() === '' ? 'Required' : '')
    );

    const lastNameError$ = lastName$.pipe(
        map(val => val.trim() === '' ? 'Required' : '')
    );

    const emailError$ = email$.pipe(
        map(val => {
            if (val.trim() === '') return 'Required';
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Invalid email';
            return '';
        })
    );

    const streetError$ = street$.pipe(
        map(val => val.trim() === '' ? 'Required' : '')
    );

    const cityError$ = city$.pipe(
        map(val => val.trim() === '' ? 'Required' : '')
    );

    const zipCodeError$ = zipCode$.pipe(
        map(val => val.trim() === '' ? 'Required' : '')
    );

    // Form validity
    const isFormValid$ = combineLatest([
        firstNameError$,
        lastNameError$,
        emailError$,
        streetError$,
        cityError$,
        zipCodeError$
    ]).pipe(
        map(errors => errors.every(error => error === ''))
    );

    // Actions
    const submitClick$ = new Subject<void>();

    submitClick$.subscribe(() => {
        alert(`Complete Form Submitted!\n\nPerson:\n${firstName$.value} ${lastName$.value}\n${email$.value}\n\nAddress:\n${street$.value}\n${city$.value}, ${zipCode$.value}`);
    });

    const form = new FormBuilder()
        .withCaption(of('Registration Form'));

    const fields = form.withFields(2);
    
    fields.addHeading(1, 2).withCaption(of('Personal Information'));

    fields.addTextField(1, 1)
        .withLabel(of('First Name'))
        .withPlaceholder(of('John'))
        .withValue(firstName$)
        .withError(firstNameError$)
        .withStyle(of(TextFieldStyle.FILLED));

    fields.addTextField(2, 1)
        .withLabel(of('Last Name'))
        .withPlaceholder(of('Doe'))
        .withValue(lastName$)
        .withError(lastNameError$)
        .withStyle(of(TextFieldStyle.FILLED));

    fields.addTextField(1, 2)
        .withLabel(of('Email'))
        .withPlaceholder(of('john.doe@example.com'))
        .withValue(email$)
        .withError(emailError$)
        .withStyle(of(TextFieldStyle.FILLED));

    fields.addHeading(1, 2).withCaption(of('Address'));

    fields.addTextField(1, 2)
        .withLabel(of('Street Address'))
        .withPlaceholder(of('123 Main St'))
        .withValue(street$)
        .withError(streetError$)
        .withStyle(of(TextFieldStyle.FILLED));

    fields.addTextField(1, 1)
        .withLabel(of('City'))
        .withPlaceholder(of('New York'))
        .withValue(city$)
        .withError(cityError$)
        .withStyle(of(TextFieldStyle.FILLED));

    fields.addTextField(2, 1)
        .withLabel(of('ZIP Code'))
        .withPlaceholder(of('10001'))
        .withValue(zipCode$)
        .withError(zipCodeError$)
        .withStyle(of(TextFieldStyle.FILLED));

    const toolbar = form.withToolbar();
    toolbar.withPrimaryButton()
        .withCaption(of('Complete Registration'))
        .withEnabled(isFormValid$)
        .withClick(submitClick$);

    const container = form.build();
    container.classList.add('p-4', 'max-w-2xl');

    return container;
};
