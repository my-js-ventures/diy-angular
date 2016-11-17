import literals from '../literals';

export default class ASTBuilder {

    static ARRAY = Symbol.for('ARRAY');
    static IDENTIFIER = Symbol.for('IDENTIFIER');
    static LITERAL = Symbol.for('LITERAL');
    static THIS = Symbol.for('THIS');
    static LITERALS = {
        'false': {
            type: ASTBuilder.LITERAL,
            value: false
        },
        'null': {
            type: ASTBuilder.LITERAL,
            value: null
        },
        'this': {
            type: ASTBuilder.THIS
        },
        'true': {
            type: ASTBuilder.LITERAL,
            value: true
        }
    };
    static OBJECT = Symbol.for('OBJECT');
    static OBJECT_PROPERTY = Symbol.for('OBJECT_PROPERTY');
    static OBJECT_PROPERTY_EXPRESSION = Symbol.for('OBJECT_PROPERTY_EXPRESSION');
    static PROGRAM = Symbol.for('PROGRAM');

    constructor(lexer) {

        this.lexer = lexer;

    }

    build(text) {

        this.tokens = this.lexer.lex(text);

        return this.program();

    }

    constant() {

        return {
            type: ASTBuilder.LITERAL,
            value: this.consume().value
        };

    }

    consume(text) {

        const token = this.expect(text);

        if (!token) {

            throw new Error(`${literals.UNEXPECTED_EXPECTED} ${text}`);

        }

        return token;

    }

    declareArray() {

        const elements = [];

        if (!this.peek(']')) {

            do {

                if (this.peek(']')) {

                    break;

                }

                elements.push((this.primary()));

            } while (this.expect(','));

        }

        this.consume(']');

        return {
            elements,
            type: ASTBuilder.ARRAY
        };

    }

    declareObject() {

        const properties = [];

        if (!this.peek('}')) {

            do {

                const property = {
                    type: ASTBuilder.OBJECT_PROPERTY
                };

                property.key = this.peek().identifier ? this.identifier() : this.constant();
                this.consume(':');
                property.value = this.primary();

                properties.push(property);

            } while (this.expect(','));

        }

        this.consume('}');

        return {
            properties,
            type: ASTBuilder.OBJECT
        };

    }

    expect(text) {

        if (this.peek(text)) {

            return this.tokens.shift();

        }

        return null;

    }

    identifier() {

        return {
            name: this.consume().text,
            type: ASTBuilder.IDENTIFIER
        };

    }

    peek(text) {

        if (this.tokens.length) {

            if (this.tokens[0].text === text || !text) {

                return this.tokens[0];

            }

        }

        return null;

    }

    primary() {

        let primary;

        if (this.expect('[')) {

            primary = this.declareArray();

        } else if (this.expect('{')) {

            primary = this.declareObject();

        } else if (ASTBuilder.LITERALS[this.tokens[0].text]) {

            primary = ASTBuilder.LITERALS[this.consume().text];

        } else if (this.peek().identifier) {

            primary = this.identifier();

        } else {

            primary = this.constant();

        }

        while (this.expect('.')) {

            primary = {
                object: primary,
                property: this.identifier(),
                type: ASTBuilder.OBJECT_PROPERTY_EXPRESSION
            };

        }

        return primary;

    }

    program() {

        return {
            body: this.primary(),
            type: ASTBuilder.PROGRAM
        };

    }

}
