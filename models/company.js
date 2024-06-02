"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError, ExpressError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
          `SELECT handle
           FROM companies
           WHERE handle = $1`,
        [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
          `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
        [
          handle,
          name,
          description,
          numEmployees,
          logoUrl,
        ],
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll({ name, minEmployees, maxEmployees } = {}) {
    // set the base query that we will use to search the database
    let baseQuery = 
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           `;
    // set up whereClauses and queryValues arrays to store the WHERE clause values for the SQL request
    let whereClauses = [];
    let queryValues = [];

    if (minEmployees > maxEmployees){
      throw new BadRequestError(`Minimum employees can not be greater than Maximum employees.`);
    }
    
    // if minEmployees is not undefined, add the minEmployees to the queryValues and then use the length of queryValues to assign the positional placeholder, then store that value in the whereClauses array
    if (minEmployees !== undefined) {
      queryValues.push(minEmployees);
      whereClauses.push(`num_employees >= $${queryValues.length}`)
    }

      // if maxEmployees is not undefined, add the maxEmployees to the queryValues and then use the length of queryValues to assign the positional placeholder, then store that value in the whereClauses array
    if (maxEmployees !== undefined) {
      queryValues.push(maxEmployees);
      whereClauses.push(`num_employees <= $${queryValues.length}`)
    }

    // if there is a name, add th ename to the queryValues and then use the length of queryValues to assign the positional placeholder, then store that value in the whereClauses array
    if(name) {
      // add % so you can see all the names that include the query value
      queryValues.push(`%${name}%`);
      // add ILIKE for case-insensitive matching
      whereClauses.push(`name ILIKE $${queryValues.length}`)
    }

    if(whereClauses.length > 0 ){
      baseQuery += " WHERE " + whereClauses.join(" AND ");
    }

    //  separate the ORDER BY name line so that it can remain at the end of the request
    baseQuery += " ORDER BY name"

    const companiesRes = await db.query(baseQuery, queryValues)
    return companiesRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
          `SELECT c.handle,
                  c.name,
                  c.description,
                  c.num_employees AS "numEmployees,
                  c.logo_url AS "logoUrl",
                  j.id AS "jobId"
                  j.title AS "jobTitle",
                  j.salary AS "jobSalary",
                  j.equity AS "jobEquity"
            FROM companies as c
            LEFT JOIN jobs AS j ON c.handle = j.company_handle
            WHERE c.handle = $1`,
        [handle]);

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    const jobs = companyRes.rows.filter(row => row.jobTitle).map(({ jobTitle, jobSalary, jobEquity}) => ({title: jobTitle, salary: jobSalary, equity: jobEquity}));

    delete company.jobTitle;
    delete company.jobSalary;
    delete company.jobEquity;

    company.jobs = jobs;

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          numEmployees: "num_employees",
          logoUrl: "logo_url",
        });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
          `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
        [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


module.exports = Company;
