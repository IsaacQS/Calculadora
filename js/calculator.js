// Calculadora vanilla basada en el artículo de Zell Liew (freeCodeCamp):
// funciones puras deciden qué se muestra y el estado vive en calculator.dataset.
// Añadidos propios: tope de dígitos, limpieza de coma flotante, error de
// división entre cero recuperable y soporte de teclado físico.

'use strict';

const MAX_DIGITS = 14;

const OPERATIONS = {
    add:      (a, b) => a + b,
    subtract: (a, b) => a - b,
    multiply: (a, b) => a * b,
    divide:   (a, b) => a / b,
};

const calculator = document.querySelector('.calculator');
const display = document.querySelector('[data-display]');
const keys = document.querySelector('.calculator__keys');

// 12 cifras significativas esconden la basura binaria: 0.1 + 0.2 → 0.3
const trim = (value) => String(Number(value.toPrecision(12)));

function calculate(n1, operator, n2) {
    const result = OPERATIONS[operator](parseFloat(n1), parseFloat(n2));
    // la única forma de colar un no-finito es dividir entre cero
    if (!Number.isFinite(result)) return 'Error';
    return trim(result);
}

const getKeyType = (key) => {
    const { action } = key.dataset;
    if (!action) return 'number';
    return action in OPERATIONS ? 'operator' : action;
};

const digitCount = (str) => str.replace(/[^0-9]/g, '').length;

function createResultString(key, displayedNum, state) {
    const keyContent = key.textContent;
    const { action } = key.dataset;
    const { firstValue, modValue, operator, previousKeyType } = state;
    const keyType = getKeyType(key);

    // tras un operador, un igual o un error, lo que se teclee arranca de cero
    const startsNewNumber =
        displayedNum === '0' ||
        displayedNum === 'Error' ||
        previousKeyType === 'operator' ||
        previousKeyType === 'calculate';

    if (keyType === 'number') {
        if (startsNewNumber) return keyContent;
        if (digitCount(displayedNum) >= MAX_DIGITS) return displayedNum;
        return displayedNum + keyContent;
    }

    if (action === 'decimal') {
        if (startsNewNumber) return '0.';
        if (!displayedNum.includes('.')) return displayedNum + '.';
        return displayedNum;
    }

    if (keyType === 'operator') {
        // encadena sobre la marcha: con 8 − 1 − ya muestra 7 antes del siguiente número
        return firstValue && operator &&
            previousKeyType !== 'operator' &&
            previousKeyType !== 'calculate'
            ? calculate(firstValue, operator, displayedNum)
            : displayedNum;
    }

    if (action === 'clear') return 0;

    if (action === 'calculate') {
        // repetir = reutiliza el segundo operando anterior: 5 × = → 25, = → 125
        return firstValue
            ? previousKeyType === 'calculate'
                ? calculate(displayedNum, operator, modValue)
                : calculate(firstValue, operator, displayedNum)
            : displayedNum;
    }
}

function updateCalculatorState(key, calculatedValue, displayedNum) {
    const keyType = getKeyType(key);
    const { firstValue, modValue, operator, previousKeyType } = calculator.dataset;

    calculator.dataset.previousKeyType = keyType;

    if (keyType === 'operator') {
        calculator.dataset.operator = key.dataset.action;
        // con Error en pantalla no hay nada que encadenar
        calculator.dataset.firstValue =
            displayedNum === 'Error'
                ? ''
                : firstValue && operator &&
                  previousKeyType !== 'operator' &&
                  previousKeyType !== 'calculate'
                    ? calculatedValue
                    : displayedNum;
    }

    if (keyType === 'calculate') {
        calculator.dataset.modValue =
            firstValue && previousKeyType === 'calculate'
                ? modValue
                : displayedNum;
    }

    if (calculatedValue === 'Error') {
        calculator.dataset.firstValue = '';
        calculator.dataset.modValue = '';
        calculator.dataset.operator = '';
    }

    // CE solo limpió la entrada; llegar aquí con AC sí resetea todo
    if (keyType === 'clear' && key.textContent === 'AC') {
        calculator.dataset.firstValue = '';
        calculator.dataset.modValue = '';
        calculator.dataset.operator = '';
        calculator.dataset.previousKeyType = '';
    }
}

function updateVisualState(key) {
    const keyType = getKeyType(key);

    keys.querySelectorAll('.is-depressed').forEach((k) => k.classList.remove('is-depressed'));
    if (keyType === 'operator') key.classList.add('is-depressed');

    display.classList.toggle('is-error', display.textContent === 'Error');

    // cualquier tecla que no sea clear apaga AC; pulsar clear lo vuelve a prender
    if (keyType === 'clear' && key.textContent === 'CE') {
        key.textContent = 'AC';
    } else if (keyType !== 'clear') {
        keys.querySelector('[data-action="clear"]').textContent = 'CE';
    }
}

// primero el próximo valor (sin efectos), recién después se pinta y muta estado
function pressKey(button) {
    const displayedNum = display.textContent;
    const resultString = createResultString(button, displayedNum, calculator.dataset);

    display.textContent = resultString;
    display.classList.toggle('is-long', resultString.length >= 13);
    updateCalculatorState(button, resultString, displayedNum);
    updateVisualState(button);
}

keys.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    pressKey(button);
});

const KEY_SELECTORS = {
    Enter:   '.key--equal',
    '=':     '.key--equal',
    Escape:  '[data-action="clear"]',
    '+':     '[data-action="add"]',
    '-':     '[data-action="subtract"]',
    '*':     '[data-action="multiply"]',
    '/':     '[data-action="divide"]',
    '.':     '[data-action="decimal"]',
    ',':     '[data-action="decimal"]',
};

function buttonForKey(keyName) {
    if (/^[0-9]$/.test(keyName)) {
        return [...keys.children].find(
            (button) => !button.dataset.action && button.textContent.trim() === keyName
        );
    }
    const selector = KEY_SELECTORS[keyName];
    return selector ? keys.querySelector(selector) : undefined;
}

document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const button = buttonForKey(event.key);
    if (!button) return;

    // sin preventDefault, '/' abre búsqueda rápida en Firefox y Enter re-clickea el botón enfocado
    event.preventDefault();
    pressKey(button);

    button.classList.add('is-pressed');
    setTimeout(() => button.classList.remove('is-pressed'), 130);
});
