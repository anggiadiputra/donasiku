/**
 * Convert number to Indonesian words (terbilang)
 */
export function numberToWords(num: number): string {
    if (num === 0) return 'NOL';

    const ones = ['', 'SATU', 'DUA', 'TIGA', 'EMPAT', 'LIMA', 'ENAM', 'TUJUH', 'DELAPAN', 'SEMBILAN'];
    const teens = ['SEPULUH', 'SEBELAS', 'DUA BELAS', 'TIGA BELAS', 'EMPAT BELAS', 'LIMA BELAS', 'ENAM BELAS', 'TUJUH BELAS', 'DELAPAN BELAS', 'SEMBILAN BELAS'];
    const tens = ['', '', 'DUA PULUH', 'TIGA PULUH', 'EMPAT PULUH', 'LIMA PULUH', 'ENAM PULUH', 'TUJUH PULUH', 'DELAPAN PULUH', 'SEMBILAN PULUH'];

    function convertLessThanThousand(n: number): string {
        if (n === 0) return '';
        if (n < 10) return ones[n];
        if (n < 20) return teens[n - 10];
        if (n < 100) {
            const ten = Math.floor(n / 10);
            const one = n % 10;
            return tens[ten] + (one > 0 ? ' ' + ones[one] : '');
        }

        const hundred = Math.floor(n / 100);
        const remainder = n % 100;
        const hundredWord = hundred === 1 ? 'SERATUS' : ones[hundred] + ' RATUS';
        return hundredWord + (remainder > 0 ? ' ' + convertLessThanThousand(remainder) : '');
    }

    if (num < 1000) {
        return convertLessThanThousand(num);
    }

    if (num < 1000000) {
        const thousands = Math.floor(num / 1000);
        const remainder = num % 1000;
        const thousandWord = thousands === 1 ? 'SERIBU' : convertLessThanThousand(thousands) + ' RIBU';
        return thousandWord + (remainder > 0 ? ' ' + convertLessThanThousand(remainder) : '');
    }

    if (num < 1000000000) {
        const millions = Math.floor(num / 1000000);
        const remainder = num % 1000000;
        const millionWord = millions === 1 ? 'SATU JUTA' : convertLessThanThousand(millions) + ' JUTA';
        return millionWord + (remainder > 0 ? ' ' + numberToWords(remainder) : '');
    }

    if (num < 1000000000000) {
        const billions = Math.floor(num / 1000000000);
        const remainder = num % 1000000000;
        const billionWord = billions === 1 ? 'SATU MILIAR' : convertLessThanThousand(billions) + ' MILIAR';
        return billionWord + (remainder > 0 ? ' ' + numberToWords(remainder) : '');
    }

    return 'ANGKA TERLALU BESAR';
}

/**
 * Convert amount to Indonesian Rupiah words
 */
export function amountToWords(amount: number): string {
    const words = numberToWords(amount);
    return `${words} RUPIAH`;
}
