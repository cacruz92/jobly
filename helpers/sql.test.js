const { sqlForPartialUpdate } = require("./sql");
const { BadRequestError } = require("../expressError");
const { json } = require("body-parser");

describe("sqlForPartialUpdate", function () {
    test("works: valid input", () => {
        const dataToUpdate = { firstName: 'Christian', age: 32};
        const jsToSql = { firstName: "first_name" };

        const result = sqlForPartialUpdate(dataToUpdate, jsToSql);

        expect(result).toEqual({
            setCols: '"first_name"=$1, "age"=$2',
            values: ['Christian', 32]
        });
    });

    test("works: no jsToSql mapping", () => {
        const dataToUpdate = { firstName:"Christian", age:32 };
        const jsToSql = {};

        const result = sqlForPartialUpdate(dataToUpdate, jsToSql);

        expect(result).toEqual({
            setCols:'"firstName"=$1, "age"=$2',
            values: ["Christian", 32]
        });
    });

    test("throws BadRequestError if no data", () => {
        expect(() => {
            sqlForPartialUpdate({}, {})}).toThrow(BadRequestError);
        });
    });

