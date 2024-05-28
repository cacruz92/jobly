"use strict";

/** Routes for jobs. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, ensureIsAdmin, ensureCorrectUserOrAdmin } = require("../middleware/auth");
const Job = require("../models/job");

const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");

const router = new express.Router();


/** POST / { job } =>  { job }
 *
 * job should be { title, salary, equity, companyHandle }
 *
 * Returns { title, salary, equity, companyHandle }
 *
 * Authorization required: Admin
 */

router.post("/", ensureIsAdmin, async function (req, res, next) {
    try {
      const validator = jsonschema.validate(req.body, jobNewSchema);
      if (!validator.valid) {
        const errs = validator.errors.map(e => e.stack);
        throw new BadRequestError(errs);
      }
  
      const job = await Job.create(req.body);
      return res.status(201).json({ job });
    } catch (err) {
      return next(err);
    }
  });
  
  /** GET /  =>
   *   { jobs: [ { title, salary, equity, companyHandle }, ...] }
   *
   * Can filter on provided search filters:
   * - minSalary
   * - hasEquity
   * - titleLike (will find case-insensitive, partial matches)
   *
   * Authorization required: none
   */
  
  router.get("/", async function (req, res, next) {
    try {
      const { title, minSalary, hasEquity } = req.query
      const jobs = await Job.findAll({ title, minSalary, hasEquity });
      return res.json({ jobs });
    } catch (err) {
      return next(err);
    }
  });
  
  /** GET /[title]  =>  { job }
   *
   *  Job is { title, salary, equity, companyHandle }
   *   where jobs is [{ title, salary, equity, companyHandle }, ...]
   *
   * Authorization required: none
   */
  
  router.get("/:title", async function (req, res, next) {
    try {
      const job = await Job.get(req.params.title);
      return res.json({ job });
    } catch (err) {
      return next(err);
    }
  });
  
  /** PATCH /[title] { fld1, fld2, ... } => { job }
   *
   * Patches job data.
   *
   * fields can be: { title, salary, equity }
   *
   * Returns { title, salary, equity, companyHandle }
   *
   * Authorization required: login
   */
  
  router.patch("/:title", ensureIsAdmin, async function (req, res, next) {
    try {
      const validator = jsonschema.validate(req.body, jobUpdateSchema);
      if (!validator.valid) {
        const errs = validator.errors.map(e => e.stack);
        throw new BadRequestError(errs);
      }
  
      const job = await Job.update(req.params.title, req.body);
      return res.json({ job });
    } catch (err) {
      return next(err);
    }
  });
  
  /** DELETE /[title]  =>  { deleted: title }
   *
   * Authorization: login
   */
  
  router.delete("/:title", ensureIsAdmin, async function (req, res, next) {
    try {
      await Job.remove(req.params.title);
      return res.json({ deleted: req.params.title });
    } catch (err) {
      return next(err);
    }
  });


module.exports = router;