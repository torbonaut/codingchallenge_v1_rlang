
function getFileAsString(url) {
    url = 'https://api.codetabs.com/v1/proxy?quest=' + url; console.log(url);
    return new Promise(function (resolve, reject) {
        if (typeof window !== 'undefined') {
            // Browser context
            const request = new XMLHttpRequest();
            request.open('GET', url, true);
            request.onload = function () {
                if (this.status >= 200 && this.status < 400) {
                    resolve(this.response);
                } else {
                    reject(this.status);
                }
            };
            request.onerror = function (err) {
                reject(err);
            };
            request.send();
        } else {
            console.log('[getFileAsString] > no node support ...')
        }
    });
}

/* default rules */
let replacementChar = 'r';
let vowels = 'aeiouäöüAEIOUÄÖÜ';
let noReplacementProximity = 3;
let forbiddenEndings = ['en'];
let noReplacementAfterDoubleVowel = true;
let disallowedChars = '[\'/?!.:;)“,]}\r';

// global variables
let content = '';
let dictionary =  new Map();

const tests = [
    // Torben Tests
    ['Aal', 'Aal'],
    ['Donaulamm', 'Dornaularmm'],
    ['Roroborom', 'Roroborom'],
    ['Otto', 'Ortto'],
    // Test Rule 1
    ['Teest', 'Teest'],
    ['Tessseet', 'Terssseet'],
    ['Tesseet', 'Tersseet'],
    ['Teseet', 'Terseet'],
    // Test Rule 2
    ['Tsssste', 'Tsssste'],
    // Test Rule 3
    ['den', 'den'],
    ['Testen', 'Tersten'],
    // Test Rule 4
    ['Terst', 'Terst'],
    // Test Rule 5
    ['Test', 'Terst'],
    ['Teest', 'Teest'],
    ['Tessest', 'Tersserst'],
    ['Tsssestr', 'Tsssestr'],
    ['Teset', 'Terset'],
    ['Tesset', 'Terssert'],
    ['Tsrset', 'Tsrset'],
    ['Tssettr', 'Tssettr'],
    ['Tssetttr', 'Tssertttr'],
    ['Teseat', 'Terseat'],
    ['Ttttettrttet', 'Ttttettrttert'],
    // Test punctuation
    ['Ttte, Ttte. Ttte! Ttte? Ttte: Ttte;', 'Ttte, Ttte. Ttte! Ttte? Ttte: Ttte;'],
    ['hassen...', 'harssen...'],
    ['„Tsssste“', '„Tsssste“'],
    //['(Tsssste) (Tssesste)', '(Tsssste) (Tssersste)'],
    //['[Tsssste] [Tssesste]', '[Tsssste] [Tssersste]'],
    ['{Tsssste} {Tssesste}', '{Tsssste} {Tssersste}'],
    ['Tsssste/', 'Tsssste/'],
    ['Tsssste\'s', 'Tsssste\'s'],
    // Test numeric stuff
    ['100th, 1st, 2nd, 4010ten, ten100', '100th, 1st, 2nd, 4010ten, ten100'],
    // Others
    ['Zwölf Boxkämpfer jagen Viktor quer über den großen Sylter Deich.', 'Zwörlf Borxkärmpfer jargen Virktor quer über den großen Sylter Deich.']

];

function loadBook() {
    const url = document.getElementById('book').value;

    if (!url.length) {
        alert('Please add URL to text file (*.txt)!');
        return;
    }

    getFileAsString(url).then(function(response) {
        content = response;

        if(content.length) {
            let message = '<span class="info">Content loaded. Ready to run translation.</span>';
            document.getElementById('output').innerHTML = message + content;


        } else {
            alert('No content received');
        }
    }, function(error) {
        console.log(error);
    });
}

function getSettings() {
    let setting;

    setting = document.getElementById('replacementChar').value;
    if(setting != '') {
        replacementChar = setting;
    }

    setting = document.getElementById('vowels').value;
    if(setting != '') {
        vowels = setting;
    }

    setting = document.getElementById('noReplacementProximity').value;
    if(parseInt(setting) > 0) {
        noReplacementProximity = parseInt(setting);
    }

    setting = document.getElementById('forbiddenEndings').value;
    if(setting != '') {
        forbiddenEndings = setting.split(',');
    }

    setting = document.getElementById('noReplacementAfterDoubleVowel').value;
    if(parseInt(setting) == 1) {
        noReplacementAfterDoubleVowel = true;
    }  else {
        noReplacementAfterDoubleVowel = false;
    }
}

function runTests() {
    getSettings();

    let a, b, result, words, o;
    let start_time = performance.now();
    let end_time = 0;

    // loop through tests
    for(let i = 0; i < tests.length; i++ ) {
        a = o =tests[i][0];
        b = tests[i][1];

        // loop through words
        words = a.split(' ');
        for(let j = 0; j < words.length; j++) {
            result = translate(words[j]);
            if(result != words[j]) {
                a = a.replace(new RegExp(words[j], 'g'), result);
            }
        }

        console.log({
            INPUT: o,
            OUTPUT: a,
            SHOULD: b,
            RESULT: a == b
        });
    }

    end_time = performance.now();

    message = '<span class="info">Tests finished. Check Console for duration and more.</span>';
    document.getElementById('output').innerHTML = message;

    console.log('time taken for tests: ' + ((end_time-start_time)/1000) + ' seconds.');
    console.log('dictionary size: ' + dictionary.size);
}

function runTranslation() {
    getSettings();

    if(content == '') {
        console.log('no content, no translation.');
        let message = '<span class="error">no content, no translation.</span>';
        document.getElementById('output').innerHTML = message;
        return;
    }

    let start_time = performance.now();
    let end_time = 0;
    let words = content.split(' ');

    console.log(words.length + ' words found. start translating ... start time in ms: ' + start_time);

    for(let i = 0; i < words.length; i++) {
        let result = translate(words[i]);
        if(result != words[i]) {
            words[i] = result;
        }

    }

    let translatedWords = words.join(' ');

    end_time = performance.now();

    message = '<span class="info">Translation finished. Check Console for duration and more.</span>';
    document.getElementById('output').innerHTML = message + translatedWords;

    console.log('time taken for translation: ' + ((end_time-start_time)/1000) + ' seconds.');
    console.log('dictionary size: ' + dictionary.size);
}


function translate(word) {
    if(!dictionary.has(word)) {
        let originalWord = word;
        
        // calculate new string length, ignore disallowed chars
        let length = word.length;
        for(let i = 0; i < disallowedChars.length; i++) {
            let index = word.indexOf(disallowedChars[i]);
            if(index != -1) {
                length = index ;
                break;
            }
        }

        for(let i = 0; i < length; i++) {
            if( vowels.indexOf(word[i]) != -1) {

                // char at pos i is a vowel ... do checks
                if(
                    checkDoesntContainNumbers(word, i, length)
                    && checkNextNoReplacementChar(word, i, length)
                    && checkHasNoDoubleVowel(word, i, length)
                    && checkNoReplacementCharInRange(word, i, length)
                    && checkHasNoForbiddenEndings(word, i, length)
                    && checkIsNotLast(word, i, length)
                ) {
                    // all checks passed > insert replacement char
                    word = word.slice(0,i+1) + replacementChar + word.slice(i+1);
                    i++;
                    length++;
                }
            }
        }

        dictionary.set(originalWord, word);

        return word;
    } else {
        return dictionary.get(word);
    }
}

function checkHasNoDoubleVowel(word, pos, length) {
    if( noReplacementAfterDoubleVowel &&
        (vowels.indexOf(word[pos-1]) != -1
        ||
        vowels.indexOf(word[pos+1]) != -1)
    ) {
        return false;
    }
    return true;
}

function checkNoReplacementCharInRange(word, pos, length) {
    let isNotInProximity = true;

    let start = Math.max(0, pos - noReplacementProximity + 1);
    let end = Math.min(pos + noReplacementProximity , length - 1);

    for(let i = start; i <= end; i++) {
        if(word[i] === replacementChar) {
            isNotInProximity = false;
            break;
        }
    }

    return isNotInProximity;
}

function checkHasNoForbiddenEndings(word, pos, length)  {
    let hasNoForbiddenEndings = true;

    for(let i = 0, l = forbiddenEndings.length; i < l; i++) {
        if(pos+forbiddenEndings[i].length == length  && word.indexOf(forbiddenEndings[i]) == pos) {
            hasNoForbiddenEndings = false;
            break;
        }
    }

    return hasNoForbiddenEndings;
}

function checkIsNotLast(word, pos, length) {
    return (length-1) != pos;
}

function checkNextNoReplacementChar(word, pos, length) {
    return !(word[pos+1] == replacementChar);
}

function checkDoesntContainNumbers(word, pos, length) {
    let noNumbers = true;

    for(let i = 0; i < length; i++) {
        if("0123465789".indexOf(word[i]) != -1) {
            noNumbers = false;
            break;
        }
    }

    return noNumbers;
}