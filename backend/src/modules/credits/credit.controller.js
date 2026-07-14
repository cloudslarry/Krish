import ApiResponse from "../../common/utils/api-response.js";
import * as creditService from "./credit.service.js";

const getCredits = async (req, res, next) => {
  try {
    const data = await creditService.getCredits(req.params.citizenId);
    ApiResponse.ok(res, "Credits loaded", data);
  } catch (error) {
    next(error);
  }
};

const adjustCredits = async (req, res, next) => {
  try {
    const data = await creditService.adjustCredits({
      citizenId: req.params.citizenId,
      amount: req.body.amount,
      reason: req.body.reason,
      type: req.body.type,
      metadata: req.body.metadata,
    });
    ApiResponse.ok(res, "Credits updated", data);
  } catch (error) {
    next(error);
  }
};

export { getCredits, adjustCredits };
