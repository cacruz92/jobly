const { BadRequestError } = require("../expressError");

// THIS NEEDS SOME GREAT DOCUMENTATION.

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  // extract the keys from the dataToUpdate
  const keys = Object.keys(dataToUpdate);
  // If there are no keys to extract, throw an error stateing that no data was entered
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  // map out the keys so that you can match each column name with the corresponding index/positional placeholder for the SQL request
  const cols = keys.map((colName, idx) =>
    // if the JavaScript/camelcase column name needs to be converted to snake case, this will perform the change
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );
// returns an object with the column names as strings with their corresponding SQL positional placeholder AND a values key with an array of the values that correspond to the column names.
  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
