import {
  AccessoryPlugin,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  PlatformConfig,
  CharacteristicValue,
  HAP,
  Logging,
  Service,
  CharacteristicEventTypes
} from "homebridge";
import { AweSomeHTTPConfig, AweSomeHTTPSensorConfigInterface } from "./configTypes";
import request = require("superagent");
import cacheModule = require("cache-service-cache-module");
import superagentCache = require("superagent-cache-plugin");

const cache = new cacheModule({ storage: "session", defaultExpiration: 60 });
const sacache = superagentCache(cache);

export class AwesomeHTTPSensorAccessory implements AccessoryPlugin {

  // Require and instantiate a cache module

  // Require superagent-cache-plugin and pass your cache module
  private readonly log: Logging;

  hap: HAP;
  name: string;
  aweSomeConfig: AweSomeHTTPConfig;
  numberOfSensors: number;

  // private readonly sensorService: Service;
  private readonly services: Service[];


  constructor(hap: HAP, log: Logging, config: PlatformConfig) {

    // Force this to AwesomeConfig.
    this.log = log;
    this.hap = hap;
    this.aweSomeConfig = <unknown>config as AweSomeHTTPConfig;
    if (!this.aweSomeConfig.sensors) {
      log.info("No config yet. Go to settings and start configuring");
      this.numberOfSensors = 0;
      this.services = new Array<Service>();
      this.name = "no-config";
    }
    else {
      this.name = this.aweSomeConfig.name;
      this.numberOfSensors = this.aweSomeConfig.sensors.length;
      log.info("Found " + this.numberOfSensors + " sensor in your config");

      this.services = new Array(this.numberOfSensors + 1);

      log.debug("" + this.aweSomeConfig.sensors[0].name);
      log.info("Registering " + this.numberOfSensors + " sensors with base URL %s", this.aweSomeConfig.baseurl);

      this.aweSomeConfig.sensors.forEach(aSensor => {
        log.debug("Starting to configure Service " + aSensor.name);

        const windowService: Service = new hap.Service.ContactSensor(aSensor.name, aSensor.name);
        const statusUrl: string = this.aweSomeConfig.baseurl + aSensor.statusUrl;

        windowService.getCharacteristic(hap.Characteristic.ContactSensorState)
          .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
            log.debug("Current target of the sensor was returned: ");
            this.getRemoteState(aSensor.httpMethod, statusUrl, log, result => { log.debug("Got remote state as " + result); callback(null, result) });
          });


        this.services.push(windowService);
        setTimeout(this.monitorContactState.bind(this,windowService, aSensor), 5000);
        log.info(" + Adding Service " + aSensor.name);
      });

      this.services.push(new hap.Service.AccessoryInformation()
        .setCharacteristic(hap.Characteristic.Manufacturer, this.aweSomeConfig.manufacturer)
        .setCharacteristic(hap.Characteristic.Model, this.aweSomeConfig.model));


      log.debug("Info '%s' created, model: '%s' from manufacturer '%s'", this.aweSomeConfig.name, this.aweSomeConfig.model, this.aweSomeConfig.manufacturer);
    }
  }

  monitorContactState(windowService: Service, aSensor: AweSomeHTTPSensorConfigInterface) : void{
    this.log("Monitor Call " + aSensor.name);
    const statusUrl: string = this.aweSomeConfig.baseurl + aSensor.statusUrl;
    this.getRemoteState(aSensor.httpMethod, statusUrl, this.log, result => {
      this.log.debug("Got remote state as " + result);
      windowService.getCharacteristic(this.hap.Characteristic.ContactSensorState).setValue(result);
    });
    setTimeout(this.monitorContactState.bind(this, windowService, aSensor), 5000);
  }


  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  getRemoteState(httpMethod: string, url: string, log: Logging, callback): void {
    log.debug("HTTP REQUEST CALLING " + url + " Cache:" + this.aweSomeConfig.cacheExpiration);
    request(httpMethod, url)
      .set("Accept", "application/json")
      .use(sacache)
      .expiration(this.aweSomeConfig.cacheExpiration)
      .end(function (err, res, key) {
        if (err) {
          log.warn("HTTP failure " + key);
          log.warn(err);
        } else {
          log.debug("HTTP success body %s", res.body);
          log.debug("HTTP success Sensor on is %s", res.body.open);
          callback(res.body.open);
        }
      });
  }


  /*
   * This method is optional to implement. It is called when HomeKit ask to identify the accessory.
   * Typical this only ever happens at the pairing process.
   */
  identify(): void {
    this.log("Identify!");
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  getServices(): Service[] {
    this.log("Number of services are " + this.services.length);
    return this.services;
  }

}