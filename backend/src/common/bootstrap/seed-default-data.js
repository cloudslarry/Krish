import { seedDefaultData as seedCitizenData } from "../../modules/citizen/citizen.service.js";
import { seedBins } from "../../modules/bins/bin.service.js";

const seedDefaultData = async () => {
  await seedCitizenData();
  await seedBins();
};

export { seedDefaultData };
