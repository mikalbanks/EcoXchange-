import { describe, expect, it } from "vitest";
import { registerProjectFinanceV1Routes, projectFinanceHttpStatus } from "./project-finance-v1";
import { SensitivityServiceError } from "../services/project-finance-engine/sensitivity-service";

const ORG="00000000-0000-0000-0000-000000000001";
const SCENARIO="00000000-0000-0000-0000-000000000012";
const BASE="00000000-0000-0000-0000-000000000013";
const RUN="00000000-0000-0000-0000-000000000017";

function capture(sensitivity:any){
  const routes:Array<{method:string;path:string;handler:any}>=[];const app:any={};
  for(const method of ["get","post","put","patch","delete"]) app[method]=(path:string,handler:any)=>routes.push({method:method.toUpperCase(),path,handler});
  const service:any={};
  registerProjectFinanceV1Routes(app,{service,sensitivity,resolveContext:async()=>({organizationId:ORG,actorUserId:"user-1"})} as any);
  return routes;
}
function resMock(){return{statusCode:200,body:undefined as any,status(code:number){this.statusCode=code;return this},json(body:any){this.body=body;return this}}}

describe("Ticket 17 sensitivity API",()=>{
  it("registers narrow create/list/get sensitivity routes",()=>{
    const routes=capture({});
    expect(routes).toEqual(expect.arrayContaining([
      expect.objectContaining({method:"POST",path:"/api/v1/scenarios/:scenarioId/sensitivities"}),
      expect.objectContaining({method:"GET",path:"/api/v1/scenarios/:scenarioId/sensitivity-runs"}),
      expect.objectContaining({method:"GET",path:"/api/v1/sensitivity-runs/:runId"}),
    ]));
  });
  it("delegates approved PPA sensitivity to the service without finance math in the route",async()=>{
    let received:any;
    const sensitivity={run:async(args:any)=>{received=args;return{id:RUN,scenario_id:SCENARIO,base_calculation_run_id:BASE,variable:"PPA_PRICE",status:"SUCCESS",points:[]}},list:async()=>[],get:async()=>null};
    const route=capture(sensitivity).find(r=>r.method==="POST"&&r.path.endsWith("/:scenarioId/sensitivities"))!;
    const res=resMock();await route.handler({params:{scenarioId:SCENARIO},body:{base_calculation_run_id:BASE,variable:"PPA_PRICE",values:[40,45,50,55,60]},header:()=>undefined} as any,res as any);
    expect(res.statusCode).toBe(201);expect(received.variable).toBe("PPA_PRICE");expect(received.values).toEqual([40,45,50,55,60]);expect(res.body.data.id).toBe(RUN);
  });
  it("rejects variables outside the Ticket 06 registry at the request boundary",async()=>{
    const route=capture({run:async()=>{throw new Error("should not run")}}).find(r=>r.method==="POST"&&r.path.endsWith("/:scenarioId/sensitivities"))!;
    const res=resMock();await route.handler({params:{scenarioId:SCENARIO},body:{base_calculation_run_id:BASE,variable:"MERCHANT_PRICE",values:[1]},header:()=>undefined} as any,res as any);
    expect(res.statusCode).toBe(400);expect(res.body.error.code).toBe("INVALID_REQUEST");
  });
  it("maps not-applicable capacity-factor sensitivity separately from technical failure",async()=>{
    const sensitivity={run:async()=>{throw new SensitivityServiceError("SENSITIVITY_NOT_APPLICABLE","Explicit generation profile is authoritative.")}};
    const route=capture(sensitivity).find(r=>r.method==="POST"&&r.path.endsWith("/:scenarioId/sensitivities"))!;
    const res=resMock();await route.handler({params:{scenarioId:SCENARIO},body:{base_calculation_run_id:BASE,variable:"CAPACITY_FACTOR",values:[.2,.24]},header:()=>undefined} as any,res as any);
    expect(res.statusCode).toBe(422);expect(res.body.error.code).toBe("SENSITIVITY_NOT_APPLICABLE");
  });
  it("maps stale and base-mismatch states to conflicts",()=>{
    expect(projectFinanceHttpStatus("SENSITIVITY_BASE_STALE")).toBe(409);
    expect(projectFinanceHttpStatus("SENSITIVITY_BASE_MISMATCH")).toBe(409);
    expect(projectFinanceHttpStatus("SENSITIVITY_INVARIANT_FAILED")).toBe(409);
  });
});
