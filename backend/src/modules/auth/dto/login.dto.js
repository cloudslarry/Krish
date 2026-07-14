import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class LoginDto extends BaseDto {
  static schema = Joi.object({
    email: Joi.string().email().lowercase(),
    identifier: Joi.string().trim(),
    accountId: Joi.string().trim(),
    password: Joi.string().required(),
  }).or("email", "identifier", "accountId");
}

export default LoginDto;
