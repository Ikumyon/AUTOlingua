// auto_translate/js/queryParser.js

/**
 * クエリ文字列をトークンに分解する
 * @param {string} query - 検索クエリ文字列
 * @returns {string[]} トークンの配列
 */
export const tokenize = (query) => {
    // key:operator:value, key:value, および引用符で囲まれた値を処理するための正規表現
    const regex = /(!?\(|!?[a-zA-Z_]+(?::[a-zA-Z_]+)?:"(?:[^"\\]|\\.)*"|!?[a-zA-Z_]+(?::[a-zA-Z_]+)?:[^\s()|]+|[()|]|\S+)/g;
    return query.match(regex) || [];
};

/**
 * トークン配列からAST（抽象構文木）をパースする
 * @param {string[]} tokens - トークンの配列
 * @returns {object} ASTのルートノード
 */
export const parse = (tokens) => {
    let position = 0;
    const parseOr = () => {
        let left = parseAnd();
        while (position < tokens.length && tokens[position] === '|') {
            position++;
            const right = parseAnd();
            left = { type: 'OR', left, right };
        }
        return left;
    };
    const parseAnd = () => {
        const terms = [];
        while (position < tokens.length && tokens[position] !== '|' && tokens[position] !== ')') {
            const factor = parseFactor();
            if (factor) terms.push(factor); // nullチェックを追加
        }
        if (terms.length === 0) return null;
        if (terms.length === 1) return terms[0];
        return terms.reduce((acc, term) => ({ type: 'AND', left: acc, right: term }));
    };
    const parseFactor = () => {
        let token = tokens[position];
        let isNot = false;
        if (token.startsWith('!')) {
            isNot = true;
            token = token.substring(1);
        }
        let node;
        if (token === '(') {
            position++;
            node = parseOr();
            if (position >= tokens.length || tokens[position] !== ')') throw new Error('Mismatched parentheses');
            position++;
        } else {
            position++;
            const firstColonIndex = token.indexOf(':');
            if (firstColonIndex > -1) {
                const key = token.substring(0, firstColonIndex);
                let remainder = token.substring(firstColonIndex + 1);

                let operator = 'contains'; // key, original, translation のデフォルト演算子
                let value = remainder;

                // key:operator:value 形式かどうかをチェック
                const secondColonIndex = remainder.indexOf(':');
                if (secondColonIndex > -1) {
                    operator = remainder.substring(0, secondColonIndex);
                    value = remainder.substring(secondColonIndex + 1);
                } else if (['status', 'reviewed', 'tone'].includes(key)) {
                    // これらのキーはタグ文字列内で明示的な演算子を使用しない、デフォルトは 'is'
                    // 'is_not' のケースは '!' プレフィックスで処理される
                    operator = 'is';
                } else if (key === 'chars') {
                    // chars:targetOperatorValue (例: chars:key>=5)
                    const match = value.match(/^(key|original|translation)([><]=?|<=?)(\d+)$/);
                    if (match) {
                        return isNot ? { type: 'NOT', value: { type: 'TAG', key, operator: match[2], value: match[3], target: match[1] } } : { type: 'TAG', key, operator: match[2], value: match[3], target: match[1] };
                    }
                }

                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.substring(1, value.length - 1).replace(/\\"/g, '"');
                }
                node = { type: 'TAG', key, operator, value }; // operator を追加
            } else {
                node = { type: 'DEFAULT', value: token };
            }
        }
        return isNot ? { type: 'NOT', value: node } : node;
    };
    const ast = parseOr();
    if (position < tokens.length) throw new Error(`Unexpected token: ${tokens[position]}`);
    return ast;
};