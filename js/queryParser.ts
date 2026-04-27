// js/queryParser.ts

/**
 * ASTノードの型定義
 */
export type ASTNode = 
    | OrNode 
    | AndNode 
    | NotNode 
    | TagNode 
    | DefaultNode;

export interface OrNode {
    type: 'OR';
    left: ASTNode;
    right: ASTNode;
}

export interface AndNode {
    type: 'AND';
    left: ASTNode;
    right: ASTNode;
}

export interface NotNode {
    type: 'NOT';
    value: ASTNode;
}

export interface TagNode {
    type: 'TAG';
    key: string;
    operator: string;
    value: string;
    target?: string; // charsフィルターなどで使用
}

export interface DefaultNode {
    type: 'DEFAULT';
    value: string;
}

/**
 * クエリ文字列をトークンに分解する
 * @param query - 検索クエリ文字列
 * @returns トークンの配列
 */
export const tokenize = (query: string): string[] => {
    // key:operator:value, key:value, および引用符で囲まれた値を処理するための正規表現
    const regex = /(!?\(|!?[a-zA-Z_]+(?::[a-zA-Z_]+)?:"(?:[^"\\]|\\.)*"|!?[a-zA-Z_]+(?::[a-zA-Z_]+)?:[^\s()|]+|[()|]|\S+)/g;
    return query.match(regex) || [];
};

/**
 * トークン配列からAST（抽象構文木）をパースする
 * @param tokens - トークンの配列
 * @returns ASTのルートノード、またはクエリが空の場合はnull
 */
export const parse = (tokens: string[]): ASTNode | null => {
    let position = 0;

    const parseOr = (): ASTNode | null => {
        let left = parseAnd();
        if (!left) return null;

        while (position < tokens.length && tokens[position] === '|') {
            position++;
            const right = parseAnd();
            if (right) {
                left = { type: 'OR', left, right };
            }
        }
        return left;
    };

    const parseAnd = (): ASTNode | null => {
        const terms: ASTNode[] = [];
        while (position < tokens.length && tokens[position] !== '|' && tokens[position] !== ')') {
            const factor = parseFactor();
            if (factor) terms.push(factor);
        }
        
        if (terms.length === 0) return null;
        if (terms.length === 1) return terms[0];
        
        return terms.reduce((acc, term) => ({ type: 'AND', left: acc, right: term }));
    };

    const parseFactor = (): ASTNode | null => {
        let token = tokens[position];
        if (!token) return null;

        let isNot = false;
        if (token.startsWith('!')) {
            isNot = true;
            token = token.substring(1);
        }

        let node: ASTNode | null = null;

        if (token === '(') {
            position++;
            node = parseOr();
            if (position >= tokens.length || tokens[position] !== ')') {
                throw new Error('Mismatched parentheses');
            }
            position++;
        } else {
            position++;
            const firstColonIndex = token.indexOf(':');
            if (firstColonIndex > -1) {
                const key = token.substring(0, firstColonIndex);
                let remainder = token.substring(firstColonIndex + 1);

                let operator = 'contains'; // デフォルト演算子
                let value = remainder;

                // key:operator:value 形式かどうかをチェック
                const secondColonIndex = remainder.indexOf(':');
                if (secondColonIndex > -1) {
                    operator = remainder.substring(0, secondColonIndex);
                    value = remainder.substring(secondColonIndex + 1);
                } else if (['status', 'reviewed', 'tone'].includes(key)) {
                    operator = 'is';
                } else if (key === 'chars') {
                    // chars:targetOperatorValue (例: chars:key>=5)
                    const match = value.match(/^(key|original|translation)([><]=?|<=?)(\d+)$/);
                    if (match) {
                        const tagNode: TagNode = { 
                            type: 'TAG', 
                            key, 
                            operator: match[2], 
                            value: match[3], 
                            target: match[1] 
                        };
                        return isNot ? { type: 'NOT', value: tagNode } : tagNode;
                    }
                }

                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.substring(1, value.length - 1).replace(/\\"/g, '"');
                }
                node = { type: 'TAG', key, operator, value };
            } else {
                node = { type: 'DEFAULT', value: token };
            }
        }

        if (!node) return null;
        return isNot ? { type: 'NOT', value: node } : node;
    };

    const ast = parseOr();
    if (position < tokens.length) {
        throw new Error(`Unexpected token: ${tokens[position]}`);
    }
    return ast;
};
