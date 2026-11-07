# Hoist sleep audit 2026-11-07 (base vs 170.17 sources)

Lines: space = same in both, "-" only in the baseline, "+" only in the current sources. Only actions, WAIT and SLEEP are shown; refactored blocks (shared repeated block, ensure door, station weights) appear as calls. SLEEP values are seconds.

## HOISTING  (sleeps base 83, now 62)
```
  WAIT {"has_object":"hpax1"}
  WAIT {"has_object":"hoist_crew"}
  SLEEP [3,7]
  SLEEP 3.4
  SLEEP 0.2
  msg "Personnel 2 to ground"
  msg "Personnel 1 to ground"
  SLEEP 3
  WAIT {"local":"HOLDHOISTED"}
- msg "Set HOIST switch to ON position to start hoist operations"
- SLEEP [20,60]
- WAIT {"var":["L:H145_SDK_OH_HOIST","number"]}
+ call set hoist switch to on
  SLEEP [2,4]
  msg "Personnel 2 to ground"
  trigger PILOT_FO_OFF,PAX_1_ON,PAX_2_ON
  SLEEP [2,4]
+ call ensure door
  SLEEP [2,4]
  trigger HOIST_ARM_DEPLOY
  SLEEP 1
  SLEEP 2
  SLEEP [3,5]
  msg "Steady!"
  SLEEP [5,10]
  trigger PILOT_FO_OFF,PAX_1_OFF,PAX_2_ON
  trigger PAX_1_OFF
  SLEEP [5,15]
  msg "Hoist is running down"
  SLEEP 1
  call hoist down
  msg "Personnel on ground...Hold on..."
  SLEEP [3,5]
  msg "Personnel on ground and disconnected"
  SLEEP [1,3]
  msg "Hoist is running up"
  call hoist up empty
  msg "hoist is clear"
  drive hpax1
  WAIT {"local":"HOLDHOISTED"}
+ SLEEP 2
  SLEEP [2,5]
  drive hpax1
+ drive hpax1
+ drive hpax1
  SLEEP [2,5]
  SLEEP [2,8]
  SLEEP {"local":"TIME1SHORT"}
- SLEEP {"local":"TIME1MED"}
- SLEEP {"local":"TIME1LONG"}
+ call patient_wait_interval
  SLEEP [1,3]
  drive hpax1
+ drive hpax1
  SLEEP [1,5]
  SLEEP [2,8]
  SLEEP {"local":"TIME2SHORT"}
- SLEEP {"local":"TIME2MED"}
- SLEEP {"local":"TIME2LONG"}
+ call patient_wait_interval
  SLEEP [1,3]
  drive hpax1
+ drive hpax1
+ drive hpax1
  SLEEP [1,5]
  SLEEP [2,8]
  SLEEP {"local":"TIME3SHORT"}
- SLEEP {"local":"TIME3MED"}
- SLEEP {"local":"TIME3LONG"}
+ call patient_wait_interval
  SLEEP [1,3]
  SLEEP 0.5
  drive hpax1
+ drive hpax1
+ drive hpax1
  WAIT {"var":["L:PAX_HOIST","number"]}
  msg "Personnel 1 to ground"
  trigger PILOT_FO_OFF,PAX_2_ON
  trigger PAX_1_ON
- msg "Set HOIST switch to ON position to start hoist operations"
- SLEEP [20,60]
- WAIT {"var":["L:H145_SDK_OH_HOIST","number"]}
+ call set hoist switch to on
  SLEEP [2,4]
+ call ensure door
  SLEEP [2,4]
  trigger HOIST_ARM_DEPLOY
  SLEEP [2,4]
  msg "Steady!"
  SLEEP [5,20]
  trigger PAX_2_ON,PAX_3_OFF
  SLEEP [5,20]
  SLEEP [1,2]
  msg "Hoist is running down"
  call hoist down
  msg "Personnel on ground...Hold on..."
  SLEEP [3,5]
  msg "Personnel on ground and disconnected"
  SLEEP [2,3]
  msg "hoist is running up"
  call hoist up empty
  msg "hoist is clear"
  SLEEP 2
  trigger HOIST_ARM_STOW
  SLEEP 2
  SLEEP 1
+ call voice crew out clear
  msg "Medic on ground, helicopter clear, free to leave hover"
+ msg "Crew is waiting for the heli-rescuer, who is coming to the h"
+ SLEEP 2
  SLEEP [1,5]
  drive hoist_crew
  drive hoist_crew
+ drive hoist_crew
  SLEEP 1
  SLEEP [3,9]
- drive hoist_crew
  call Ground time
  SLEEP [1,3]
- SLEEP [2,8]
  SLEEP 0.5
- SLEEP [2,4]
- SLEEP {"local":"TIME1SHORT"}
- SLEEP {"local":"TIME1MED"}
- SLEEP {"local":"TIME1LONG"}
- call Patient status
  SLEEP [2,5]
- SLEEP [1,3]
+ SLEEP 3
  drive hoist_crew
- SLEEP [2,8]
- SLEEP {"local":"TIME2MED"}
- SLEEP {"local":"TIME2LONG"}
- SLEEP {"local":"TIME2SHORT"}
- call Patient2 status
- SLEEP [1,3]
  drive hoist_crew
- SLEEP [2,8]
- SLEEP {"local":"TIME3MED"}
- SLEEP {"local":"TIME3LONG"}
- SLEEP {"local":"TIME3SHORT"}
- call Patient3 status
- SLEEP [1,3]
- SLEEP 3
  drive hoist_crew
  WAIT {"local":"HOLDHOISTED"}
  SLEEP [1,3]
  SLEEP [2,8]
  msg "Ground crew is doing last operations before leaving the scen"
  SLEEP {"rand":[10,20]}
  msg "Ground crew is doing last operations before leaving the scen"
  SLEEP [5,30]
  SLEEP [10,30]
  SLEEP {"rand":[15,{"local":"TIME2SHORT"}]}
  call Life rescued
- WAIT {"var":["L:STEP","number"]}
+ call select HEMS patient
  msg "Waiting for ambulance crew operations to be completed, pleas"
+ SLEEP 480
  msg "Ground crew operations are taking more than usual, patient n"
+ call voice hoist visit
+ call select HEMS patient
  SLEEP [1,3]
  SLEEP 0.5
  SLEEP 0.5
  msg "Doctor is preparing patient for transport, waiting for a dec"
  SLEEP 3
  msg "Ground crew is doing last operations before leaving the scen"
  WAIT {"object":"hoist_crew","var":"distance:m"}
  SLEEP [90,120]
  WAIT {"local":"chevuoifare"}
  msg "Doctor is preparing for hoisting up himself only, reach hois"
  msg "DOCTOR: Load of patient on ambulance, I'll go with them to t"
  SLEEP [5,10]
  msg "Cabin ready"
+ call trace return to base
  call Hoisting back up
  call Hoisting back up
  call Hoisting back up
  call Hoisting back up
  call Hoisting back ground
```

## Hoisting back up  (sleeps base 58, now 51)
```
+ call select HEMS patient
  SLEEP 4
  msg "Ground operation completed, get back to hoist point"
  WAIT {"var":["SIM ON GROUND","bool"]}
  SLEEP 10
  WAIT {"object":"hoist_crew","var":"distance:m"}
  msg "Ready for hoisting operation, Set hover conditions"
  msg "Hold helicopter position"
- SLEEP 0.5
+ call select HEMS patient
+ call prepare selected HEMS patient
+ SLEEP 3
+ call select HEMS patient
+ call prepare selected HEMS patient
+ msg "The patient could not be prepared for the hoist, the reserva"
  SLEEP [5,10]
  msg "Hold position while patient is transported below helicopter"
  SLEEP 4
  SLEEP 2
  msg "Hold helicopter position"
  WAIT {"var":["L:PAX_HOIST","number"]}
  SLEEP 0.5
  SLEEP 3
  msg "Hoist 3 to helicopter"
  msg "Hoist 2 to helicopter"
  SLEEP 2
  SLEEP 2
  msg "Hoist 2 to helicopter, patient will not be boarded"
  msg "Hoist 1 to helicopter"
  SLEEP 2
  SLEEP 2
  msg "Hoist 1 to helicopter, patient and doctor will go with ambul"
  msg "Patient and doctor will go with ambulance, pick him to the h"
  SLEEP 2
  SLEEP 1
- drive injured_human
+ drive {local:HEMS_PATIENT_OBJECT}
+ WAIT {"has_object":"{local:HEMS_PATIENT_OBJECT}"}
  SLEEP 1.2
  drive hpax1
  drive hoist_crew
+ WAIT {"has_object":"{local:HEMS_PATIENT_OBJECT}"}
  msg "hoist 1 plus stretcher to helicopter"
  SLEEP [2.5,4]
  msg "Hold helicopter position"
  drive hoist_crew
  msg "hoist 1 to helicopter"
  SLEEP 2
+ msg "Second hoist: waiting for the hoist to be commanded out"
  WAIT {"var":["L:PAX_HOIST","number"]}
+ msg "Second hoist: hold the hover over the landing spot, speed un"
  drive hpax1
  SLEEP [5,10]
- msg "Set HOIST switch to ON position to start hoist operations"
- SLEEP [20,60]
- WAIT {"var":["L:H145_SDK_OH_HOIST","number"]}
- SLEEP [2,4]
- SLEEP [2,4]
- trigger HOIST_ARM_DEPLOY
- SLEEP 1
- SLEEP [3,7]
+ call hoist_arming_and extension
  msg "Hoist is running down, stay within 20m from operator"
  call hoist down
  msg "Hoist on ground, personnel are getting hooked"
  SLEEP [3,6]
  msg "Hoist is running up"
  call hoist up 1 operator
  SLEEP 1
  msg "Hoist is up, personnel are strapped in"
  SLEEP [3,10]
  trigger PAX_1_ON
  SLEEP [3,7]
  msg "Hoist is clear"
  trigger PILOT_FO_ON,PAX_1_ON,PAX_2_OFF
  msg "Hoist is clear, waiting for helirescuer"
  SLEEP [2,5]
  WAIT {"local":"HR_HOISTING_LOCK"}
  WAIT {"fn":"HOIST_REEL_UP_AND_STOW","params":{}}
+ call voice hoist all inside
  SLEEP 0.5
+ call ground crew runtime trace
  drive hoist_crew
+ call ground crew runtime trace
  SLEEP 5
+ msg "Waiting for the second hoist to finish before the main hoist"
  WAIT {"var":["L:PAX_HOIST","number"]}
  SLEEP [3,10]
- msg "Set HOIST switch to ON position to start hoist operations"
- SLEEP [20,60]
- WAIT {"var":["L:H145_SDK_OH_HOIST","number"]}
- SLEEP [2,4]
- SLEEP [2,4]
- trigger HOIST_ARM_DEPLOY
- SLEEP 1
- SLEEP [3,7]
+ call hoist_arming_and extension
  SLEEP 2
  msg "Hoist is running down, stay within 20m from operator"
  call hoist down
  msg "Hoist on ground, personnel are getting hooked... hold on..."
  SLEEP [3,7]
  SLEEP [2,5]
  SLEEP [2,5]
  msg "Hoist is running up"
  SLEEP 0.5
  SLEEP [2,3]
  msg "Hoist is running up"
+ call start hoist attached risk monitor
  call hoist up operator+injured
  call hoist up 1 operator
  msg "Hoist is up, personnel are getting strapped in"
  SLEEP [5,10]
  trigger PAX_3_ON
+ trigger HEMS_STRETCHER_PATIENT
  WAIT {"local":"HR_HOISTING_LOCK"}
  WAIT {"fn":"HOIST_REEL_UP_AND_STOW","params":{}}
  SLEEP [3,7]
  trigger PILOT_FO_ON,PAX_2_OFF
  trigger PAX_1_ON
  trigger PILOT_FO_ON,PAX_1_ON,PAX_2_ON,PAX_3_ON
+ call voice hoist all inside
+ call start hoist attached risk monitor
  call hoist up operator+injured
  SLEEP [0,2]
  msg "Hoist is up, boom extended, patient and doctor outside, hook"
  SLEEP [5,9]
  WAIT {"var":["AIRSPEED INDICATED","knots"]}
  msg "We are passing Hoist extended+load VNE speed (70kts). Reduce"
  WAIT {"var":["AIRSPEED INDICATED","knots"]}
  msg "Casualty's retaining cable is damaged due to speed"
  WAIT {"var":["AIRSPEED INDICATED","knots"]}
  msg "Injured is lost, medic outside is in trouble"
  WAIT {"var":["AIRSPEED INDICATED","knots"]}
  msg "Medic and injured are lost, possibly dead."
  SLEEP 3
  SLEEP 1
  WAIT {"var":["PLANE BANK DEGREES","Radians"]}
  msg "We are passing Hoist extended+load maximum bank (30 degrees)"
  WAIT {"var":["PLANE BANK DEGREES","Radians"]}
  msg "Hoist boom and retaining cable are damaged and further injur"
  WAIT {"var":["PLANE BANK DEGREES","Radians"]}
  msg "Injured is lost. Medic outside is unconscious and he is cont"
  WAIT {"var":["PLANE BANK DEGREES","Radians"]}
  SLEEP 3
  msg "Medic and injured are lost, possibly dead. Hoist operator ha"
  SLEEP 5
  SLEEP 1
  WAIT {"var":["ACCELERATION BODY Y","Feet per second squared"]}
  SLEEP 0.1
  trigger HOIST_CONTROL_MODE_MANUAL
  SLEEP 0.1
  msg "We are passing Hoist extended+load maximum load due to accel"
  msg "Hoist drum slippage due to excessive load and overload clutc"
  trigger HOIST_CONTROL_MOTOR_DOWN
  SLEEP 0.7
  trigger HOIST_CONTROL_MOTOR_STOP
  trigger HOIST_CONTROL_MOTOR_DOWN
  SLEEP 1.5
  trigger HOIST_CONTROL_MOTOR_STOP
  msg "Injured is lost, stretcher hook has failed due to excessive "
  SLEEP 3
  msg "Medic and injured are lost, possibly dead"
  SLEEP 1
+ call apply hoist crew lifescore impact
+ call apply hoist crew lifescore impact
+ call apply hoist crew lifescore impact
+ SLEEP 1
+ call apply hoist crew lifescore impact
+ call apply hoist crew lifescore impact
+ call apply hoist crew lifescore impact
+ SLEEP 1
+ call apply hoist crew lifescore impact
+ call apply hoist crew lifescore impact
+ call apply hoist crew lifescore impact
+ SLEEP 1
  WAIT {"local":"HR_HOISTING_LOCK"}
  WAIT {"local":"second_hoist_hoisting"}
  SLEEP [5,10]
  msg "Cabin ready"
+ call trace return to base
```

## Hoisting back ground  (sleeps base 65, now 57)
```
- SLEEP 0.5
+ call select HEMS patient
+ call select HEMS patient
+ call prepare selected HEMS patient
  SLEEP [5,10]
  msg "Patient is being transported to the helicopter. Keep helicop"
  SLEEP 0.95
- drive injured_human
+ drive {local:HEMS_PATIENT_OBJECT}
+ drive {local:HEMS_PATIENT_OBJECT}
+ drive {local:HEMS_PATIENT_OBJECT}
+ drive {local:HEMS_PATIENT_OBJECT}
  SLEEP 1.4
  drive hpax1
+ drive hpax1
+ drive hpax1
+ drive hpax1
  drive hoist_crew
+ WAIT {"has_object":"{local:HEMS_PATIENT_OBJECT}"}
  SLEEP 2
  drive hoist_crew
+ drive hoist_crew
  SLEEP [1,4]
  SLEEP 1
+ call ensure door
  SLEEP 0.25
  WAIT {"local":"crewpatientloaded"}
  SLEEP 1.2
  drive hpax1
  SLEEP 1
- SLEEP 1
+ SLEEP 0.5
  trigger PAX_1_ON,PAX_2_ON
  SLEEP 0.5
  SLEEP 1.2
  trigger PAX_1_ON,PAX_2_OFF
  SLEEP 2
  trigger PAX_1_OFF,PAX_2_OFF,PILOT_FO_ON
  drive hpax1
  SLEEP 1
- SLEEP 1
+ SLEEP 0.5
  trigger PAX_1_ON,PAX_2_OFF
  SLEEP 0.5
+ call ensure door
  SLEEP 2
  trigger HEMS_STRETCHER_NOPATIENT,HEMS_STRETCHER_EJECT
  SLEEP 8.2
  trigger HEMS_STRETCHER_PATIENT
  SLEEP 1
  trigger HEMS_STRETCHER_RETRACT
  SLEEP 4.5
  SLEEP 0.25
  trigger PAX_4_OFF
  SLEEP 1.5
  drive hoist_crew
+ call ensure door
  SLEEP 1
  trigger PAX_3_ON
  SLEEP 0.5
  msg "Patient will not be boarded, he will be transported by ambul"
  SLEEP 5
- SLEEP 1.2
- drive hpax1
- SLEEP 1
- SLEEP 1
- trigger PAX_1_ON,PAX_2_ON
- SLEEP 0.5
+ call shared repeated block 034
  SLEEP 1.2
  trigger PAX_1_ON,PAX_2_OFF
  SLEEP 2
  trigger PAX_1_OFF,PAX_2_OFF,PILOT_FO_ON
  drive hpax1
- SLEEP 1
+ drive hpax1
+ drive hpax1
  SLEEP 1
+ SLEEP 0.5
  trigger PAX_1_ON,PAX_2_OFF
  SLEEP 0.5
  drive hoist_crew
+ drive hoist_crew
  SLEEP 2
+ call ensure door
  SLEEP 1
  trigger PAX_3_ON
  SLEEP 0.5
  SLEEP 5
  msg "Patient and doctor will be transported by ambulance to the h"
- SLEEP 1.2
- drive hpax1
- SLEEP 1
- SLEEP 1
- trigger PAX_1_ON,PAX_2_ON
- SLEEP 0.5
+ call shared repeated block 034
  SLEEP 1.2
  trigger PAX_1_ON,PAX_2_OFF
  SLEEP 2
  trigger PAX_1_OFF,PAX_2_OFF,PILOT_FO_ON
  drive hpax1
  SLEEP 1
- SLEEP 1
+ SLEEP 0.5
  trigger PAX_1_ON,PAX_2_OFF
  SLEEP 0.5
+ call ground crew runtime trace
  drive hoist_crew
+ call ground crew runtime trace
  SLEEP 5
  SLEEP [5,10]
  call Patient status
  SLEEP 3
  drive hpax1
+ drive hpax1
+ drive hpax1
  SLEEP 2
+ call ensure door
+ SLEEP 0.5
+ trigger PAX_1_ON
  drive hoist_crew
+ call ensure door
  SLEEP 0.25
+ call ensure door
+ call prepare ambulance stretcher for HEMS loading
  WAIT {"local":"ambustretcherarrived"}
  trigger PAX_4_OFF
  trigger HEMS_STRETCHER_EJECT
  SLEEP 5.2
+ trigger HEMS_STRETCHER_PATIENT
  SLEEP 1
  trigger HEMS_STRETCHER_RETRACT
  SLEEP 4.5
  SLEEP 0.25
  SLEEP 1
  drive hoist_crew
  SLEEP 0.5
+ call ensure door
+ SLEEP 0.5
  drive hoist_crew
+ drive hoist_crew
+ call ensure door
  SLEEP 1
  SLEEP [2,5]
  drive hpax1
- SLEEP 2
- SLEEP [2,5]
- drive hoist_crew
  drive hpax1
- SLEEP 1
+ drive hpax1
+ call ensure door
+ SLEEP 0.5
+ trigger PAX_1_ON
+ call shared repeated block 033
+ drive hpax1
+ drive hpax1
+ drive hpax1
+ call ensure door
+ SLEEP 0.5
+ trigger PAX_1_ON
  SLEEP [5,10]
  msg "Cabin ready"
+ call trace return to base
```

## hoist heli rescuer down  (sleeps base 34, now 41)
```
  WAIT {"has_object":"jolly"}
  WAIT {"local":"HOLDHOISTED"}
  SLEEP [2,4]
- msg "Set HOIST switch to ON position to start hoist operations"
- SLEEP [20,60]
- WAIT {"var":["L:H145_SDK_OH_HOIST","number"]}
+ call set hoist switch to on
  SLEEP [2,4]
  msg "Personnel 3 to ground"
  trigger PILOT_FO_OFF,PAX_1_ON,PAX_2_ON
  msg "Personnel 2 to ground"
  SLEEP 1
+ call ensure door
+ SLEEP 2
  trigger HOIST_ARM_DEPLOY
  SLEEP 1
  SLEEP 2
  SLEEP [2,3]
  SLEEP [3,5]
  msg "Steady!"
  SLEEP [5,10]
  trigger PAX_1_OFF
  SLEEP [5,15]
  msg "Hoist is running down"
  call hoist down
  msg "Personnel are on ground"
  SLEEP [2,5]
  SLEEP [2,3]
  msg "Hoist is running up"
  call hoist up empty
  SLEEP [0,2]
  msg "hoist is clear"
  drive jolly
  SLEEP [2,5]
  msg "waiting for helirescuer to secure the area"
+ call voice say
  drive jolly
  SLEEP [2,5]
  SLEEP [12,25]
  SLEEP [1,3]
  drive jolly
  SLEEP [2,5]
  SLEEP [2,8]
  SLEEP [12,25]
  SLEEP [1,3]
  SLEEP [1,3]
+ call voice say
  drive jolly
  SLEEP [2,5]
  SLEEP [1,3]
  SLEEP [1,3]
  drive jolly
  SLEEP [2,5]
  SLEEP [12,25]
+ call voice say
  SLEEP 6
+ msg "Heli-rescuer is going to the hoist point to wait for the cre"
  drive jolly
+ WAIT {"local":"HR_HOIST_CREW_DOWN"}
+ msg "Heli-rescuer is leading the crew to the patient"
+ SLEEP 2
+ drive jolly
+ drive jolly
+ drive jolly
  SLEEP [2,5]
  SLEEP [2,8]
  SLEEP {"rand":[{"local":"TIME1SHORT"},50]}
  SLEEP {"rand":[{"local":"TIME1MED"},50]}
  SLEEP {"rand":[{"local":"TIME1LONG"},{"global":"CREW_SLOTH"}]}
  SLEEP [1,3]
+ WAIT {"local":"HR_HOIST_CLEANUP"}
+ msg "Heli-rescuer is restoring the scene"
+ SLEEP [1,3]
+ drive jolly
+ SLEEP [1,3]
+ drive jolly
+ SLEEP [1,3]
+ drive jolly
+ SLEEP [1,3]
+ drive jolly
+ msg "Heli-rescuer is waiting for a stable hover inside the landin"
+ SLEEP 1
+ SLEEP [2,4]
+ drive jolly
  WAIT {"local":"HR_HOISTING_LOCK"}
+ call ground return gate
  call hoist heli rescuer up
  call gnd ops heli rescuer up
```

## hoist heli rescuer up  (sleeps base 14, now 14)
```
- msg "Set HOIST switch to ON position to start hoist operations"
- SLEEP [20,60]
- WAIT {"var":["L:H145_SDK_OH_HOIST","number"]}
+ call set hoist switch to on
  SLEEP [2,4]
  trigger PILOT_FO_OFF,PAX_1_OFF,PAX_2_ON
  SLEEP [1,2]
  trigger PILOT_FO_ON,PAX_1_OFF,PAX_2_ON
  SLEEP [2,4]
+ call ensure door
  SLEEP [1,2]
  trigger HOIST_ARM_DEPLOY
+ msg "Heli-rescuer is waiting for a stable hover inside the landin"
+ SLEEP [2,4]
  drive jolly
  msg "Hold helicopter position"
  SLEEP [5,10]
  SLEEP [1,2]
  msg "Hoist is running down, stay within 20m from operator"
  call hoist down
  msg "Hoist on ground, personnel are getting hooked"
  SLEEP [1,2]
  SLEEP [2,5]
  SLEEP [2,5]
  msg "Hoist is running up"
  call hoist up 1 operator
  SLEEP [0,2]
  msg "Hoist is up, personnel are strapped in"
  SLEEP [3,10]
  trigger PAX_1_ON
  SLEEP [3,7]
  WAIT {"fn":"HOIST_REEL_UP_AND_STOW","params":{}}
  SLEEP [3,6]
  trigger PILOT_FO_ON,PAX_1_ON,PAX_2_OFF
  trigger PILOT_FO_ON,PAX_1_ON,PAX_2_ON
+ call voice hoist all inside
  call drop heli rescuer
```

## pick heli rescuer hoist  (sleeps base 27, now 25)
```
  WAIT {"location":"heli_rescuer_location","var":"distance:m"}
  msg "Manoeuvre the helicopter to hoist point"
  SLEEP 3.9
  msg "Ready for hoisting operation, Set hover conditions"
  msg "Hold helicopter position"
- msg "Set HOIST switch to ON position to start hoist operations"
- SLEEP [20,60]
- WAIT {"var":["L:H145_SDK_OH_HOIST","number"]}
+ call set hoist switch to on
  SLEEP [2,4]
  msg "Hoist one to helicopter"
  SLEEP 2
  trigger PILOT_FO_ON,PAX_1_OFF,PAX_2_ON
  msg "Hoist two to helicopter"
  msg "Hoist one to helicopter"
  SLEEP [2,3]
  trigger PILOT_FO_OFF,PAX_1_OFF,PAX_2_ON
- msg "Set HOIST switch to ON position to start hoist operations"
- SLEEP [20,60]
- WAIT {"var":["L:H145_SDK_OH_HOIST","number"]}
+ call set hoist switch to on
  SLEEP [2,4]
+ call ensure door
  SLEEP [1,3]
  trigger HOIST_ARM_DEPLOY
  drive pisteur1
  WAIT {"has_object":"pisteur1"}
  SLEEP 1
  msg "Hoist is running down, stay within 20m from operator"
  call hoist down
  msg "Hoist on ground, personnel are getting hooked"
  SLEEP [1,2]
  SLEEP [2,5]
  SLEEP 2.5
  msg "Hoist is running up"
  call hoist up 1 operator
  SLEEP [0,2]
  msg "Hoist is up, personnel are strapped in"
  SLEEP [2,10]
  trigger PAX_1_ON
  SLEEP [3,5]
  trigger PILOT_FO_ON,PAX_1_ON,PAX_2_OFF
  SLEEP [3,5]
  trigger PILOT_FO_ON,PAX_1_OFF,PAX_2_ON
  drive pisteur2
  WAIT {"has_object":"pisteur2"}
  msg "Hoist is running down, stay within 20m from operator"
  call hoist down
  msg "Hoist on ground, personnel are getting hooked"
  SLEEP [1,2]
  SLEEP [2,5]
  SLEEP 2.5
  msg "Hoist is running up"
  call hoist up 1 operator
  SLEEP [0,2]
  msg "Hoist is up, personnel are strapped in"
  SLEEP [3,10]
  trigger PAX_1_ON
  trigger PILOT_FO_ON,PAX_1_ON,PAX_2_ON
  trigger PILOT_FO_OFF,PAX_1_ON,PAX_2_ON
  SLEEP [3,5]
  WAIT {"fn":"HOIST_REEL_UP_AND_STOW","params":{}}
+ call voice hoist all inside
  msg "Hoist operations completed"
  SLEEP [3,5]
  trigger PILOT_FO_ON,PAX_1_ON,PAX_2_ON
  trigger PILOT_FO_ON,PAX_1_ON,PAX_2_OFF
  SLEEP [3,5]
  trigger PILOT_FO_ON,PAX_1_OFF,PAX_2_ON
  call zoom out
  SLEEP [3,5]
  msg " "
  call routeupdate
  SLEEP [3,5]
  SLEEP 2.2
- msg "Accident location:<br /> {0:LOCATION}"
+ call voice heli rescuer briefing
+ msg "Accident location:<br /> {0:LOCATION} ({1})"
  WAIT {"var":["L:{local:HXX}_SDK_ROTOR_RPM","number"]}
  WAIT {"location":"landing_spot","var":"distance:m"}
  call hoist heli rescuer down
  call gnd ops heli rescuer down
```

## drop heli rescuer hoist  (sleeps base 19, now 18)
```
  WAIT {"location":"heli_rescuer_location","var":"distance:m"}
  msg "Manoeuvre the helicopter to hoist point"
  SLEEP [3,9]
+ call set hoist switch to on
  msg "Ready for hoisting operation, Set hover conditions"
  msg "Hold helicopter position"
  msg "Hold helicopter position"
  SLEEP [1,3]
- msg "Set HOIST switch to ON position to start hoist operations"
- SLEEP [20,60]
- WAIT {"var":["L:H145_SDK_OH_HOIST","number"]}
  SLEEP [1,3]
  trigger PILOT_FO_ON,PAX_1_OFF,PAX_2_ON
  SLEEP [2,5]
  trigger PILOT_FO_OFF,PAX_1_ON,PAX_2_ON
  SLEEP [2,4]
+ call ensure door
  SLEEP [1,3]
  trigger HOIST_ARM_DEPLOY
  SLEEP 3
  trigger PAX_1_OFF
  SLEEP [5,15]
  msg "Hoist is running down"
  call hoist down
  msg "Personnel are on ground"
  SLEEP [2,5]
  SLEEP [2,3]
  msg "Hoist is running up"
  call hoist up empty
  SLEEP [0,2]
  drive pisteur2
  trigger PILOT_FO_OFF,PAX_1_ON,PAX_2_ON
  WAIT {"location":"heli_rescuer_location","var":"distance:m"}
  msg "Personnel, 1 to ground"
  msg "Hold helicopter position"
  SLEEP 5
  trigger PAX_1_OFF
  SLEEP [5,15]
  msg "Hoist is running down"
  call hoist down
  msg "Personnel are on ground"
  SLEEP [2,5]
  SLEEP [2,3]
  msg "Hoist is running up"
  call hoist up empty
  SLEEP [0,2]
  WAIT {"fn":"HOIST_REEL_UP_AND_STOW","params":{"before_stow_commands":[]}}
  drive pisteur1
  SLEEP 5
  trigger PILOT_FO_ON,PAX_1_OFF,PAX_2_OFF
  trigger PILOT_FO_ON,PAX_1_ON,PAX_2_OFF
+ call cabin has crew aboard
+ call heli rescuer drop farewell
+ call helirescuers_follow_destination_delayed
+ call voice crew out clear
  call zoom out
  SLEEP 0.5
  call routeupdate
- msg "Base location:<br /> {0:LOCATION}"
+ msg "Base location:<br /> {0:LOCATION} ({1})"
  WAIT {"location":"RTB_location","var":"distance"}
- msg "Hospital location:<br /> {0:LOCATION}"
+ msg "Hospital location:<br /> {0:LOCATION} ({1})"
  WAIT {"location":"hospital","var":"distance"}
- msg "Hospital location:<br /> {0:LOCATION}"
+ msg "Hospital location:<br /> {0:LOCATION} ({1})"
  WAIT {"location":"hospital_user","var":"distance"}
```

## hoist land  (sleeps base 19, now 19)
```
- WAIT {"var":["L:{local:HXX}_SDK_ROTOR_RPM","number"]}
+ call police_preposition_to_landing_spot
+ call ground ops NR gate
  SLEEP 3
  trigger HOIST_CONTROL_MODE_MANUAL
  SLEEP 1
  trigger HOIST_CONTROL_MOTOR_MOMENTARY_DOWN
  SLEEP 1
  trigger HOIST_CONTROL_MOTOR_MOMENTARY_UP
  SLEEP 1
  drive hoist_crew
  SLEEP 1
+ call ensure door
  SLEEP 0.25
+ call ensure door
  SLEEP 7.2
  SLEEP 1.5
  drive hoist_crew
+ drive hoist_crew
+ drive hoist_crew
  trigger HOIST_CONTROL_MOTOR_MOMENTARY_DOWN
  SLEEP 3
  call Patient status
  SLEEP [2,5]
  drive hoist_crew
  SLEEP 1
  SLEEP 1
+ trigger HEMS_STRETCHER_PATIENT
  SLEEP 2
  SLEEP 4.5
  SLEEP 0.25
  SLEEP 1
  drive hoist_crew
- SLEEP 1
+ call ensure door
+ SLEEP 0.5
  trigger PAX_3_ON
- SLEEP [1,3]
+ SLEEP 0.5
  trigger HOIST_CONTROL_MODE_AUTO
  WAIT {"fn":"HOIST_REEL_UP_AND_STOW","params":{}}
  SLEEP 2
  trigger PAX_2_OFF,PILOT_FO_ON
  trigger HOIST_CONTROL_MODE_AUTO
  msg "Patient loading completed"
```

## User destination hoist  (sleeps base 27, now 23)
```
+ call ground crew runtime trace
  WAIT {"location":"hospital_user","var":"distance"}
  call user destination hoist predefined
  SLEEP 1
+ call ground crew runtime trace
  WAIT {"location":"hospital_user","var":"distance"}
+ call ground crew runtime trace
  WAIT {"location":"hospital_user","var":"distance"}
+ call ground crew runtime trace
  WAIT {"location":"hospital_user","var":"distance"}
+ call ground crew runtime trace
  WAIT {"var":["GPS GROUND SPEED","knots"]}
+ call ops progress timed
  msg "LAND AND SET ENGINES TO IDLE or STOP to start unload procedu"
  SLEEP 1
+ call ground crew runtime trace
  WAIT {"var":["L:{local:HXX}_SDK_ROTOR_RPM","number"]}
- call user destination hoist at arrival
+ call shared user destination arrival scene
+ call ground crew runtime trace
  WAIT {"var":["L:{local:HXX}_SDK_ROTOR_RPM","number"]}
- call Query closest hospital unrelated for stretcher
- SLEEP 1
+ call hospital_creation_from_unhospital
+ call ground crew runtime trace
  WAIT {"var":["L:{local:HXX}_SDK_ROTOR_RPM","number"]}
  SLEEP 0.2
  call Ambulance5
  SLEEP 0.2
- drive ambulance5
- drive ambulance5
+ call drive ambulance5 safe
+ call drive ambulance5 safe
+ call ground crew runtime trace
  WAIT {"var":["L:AMBULANCE","number"]}
- WAIT {"var":["L:{local:HXX}_SDK_ROTOR_RPM","number"]}
+ call ground ops NR gate
+ call ground crew runtime trace
+ call ground crew runtime trace
+ call ground crew runtime trace
  WAIT {"var":["L:{local:HXX}_SDK_ROTOR_RPM","number"]}
  SLEEP 0.2
- WAIT {"var":["L:{local:HXX}_SDK_ROTOR_RPM","number"]}
+ call ground ops NR gate
  call Update_raw from dispatchphase
  msg "Set engines to OFF and stop the rotor to start operations"
+ call ground crew runtime trace
  WAIT {"var":["L:{local:HXX}_SDK_ROTOR_RPM","number"]}
+ call ground crew runtime trace
  drive ambumedic
+ call ground crew runtime trace
  msg "Patient unloading procedures started, please wait..."
  trigger HOIST_CONTROL_MODE_MANUAL
  SLEEP 2
  SLEEP 1
+ call ground crew runtime trace
  drive ambustretcher
+ call ground crew runtime trace
+ call ground crew runtime trace
  drive ambustretcher
+ call ground crew runtime trace
+ call voice hospital handover
  SLEEP 2.5
+ call ground crew runtime trace
  SLEEP 2.5
  trigger HOIST_CONTROL_MOTOR_MOMENTARY_DOWN
  SLEEP 1
  SLEEP 1
- SLEEP 1.8
- WAIT {"local":"crewvisiting1"}
+ call shared repeated block 021
  SLEEP 2
  trigger HOIST_CONTROL_MODE_AUTO
  msg "Patient unloading completed"
+ call post dispatcher message
+ call ground crew runtime trace
  drive ambumedic
+ call ground crew runtime trace
+ call ground crew runtime trace
+ drive ambumedic
+ call ground crew runtime trace
+ call ground crew runtime trace
+ drive ambumedic
+ call ground crew runtime trace
+ call ground crew runtime trace
+ drive ambumedic
+ call ground crew runtime trace
  SLEEP 2
  SLEEP 1
+ call ground crew runtime trace
  drive ambustretcher
+ call ground crew runtime trace
  SLEEP 10
  SLEEP 1
  call paperwork
  SLEEP 3
+ call ground crew runtime trace
  WAIT {"object":"ambumedic","var":"VELOCITY Z"}
+ call ground crew runtime trace
  drive ambumedic
+ call ground crew runtime trace
+ call ground crew runtime trace
  drive ambumedic
+ call ground crew runtime trace
+ call ground crew runtime trace
  drive ambumedic
+ call ground crew runtime trace
+ call ground crew runtime trace
  drive ambumedic
+ call ground crew runtime trace
+ call ground crew runtime trace
  WAIT {"object":"ambustretcher","var":"VELOCITY Z"}
+ call ground crew runtime trace
  drive ambustretcher
+ call ground crew runtime trace
+ call ground crew runtime trace
  drive ambustretcher
+ call ground crew runtime trace
+ call ground crew runtime trace
  drive ambustretcher
+ call ground crew runtime trace
+ call ground crew runtime trace
  drive ambustretcher
+ call ground crew runtime trace
+ call ground crew runtime trace
  WAIT {"object":"ambustretcher","var":"VELOCITY Z"}
+ call ground crew runtime trace
  drive ambustretcher
+ call ground crew runtime trace
+ call ground crew runtime trace
  WAIT {"object":"ambumedic","var":"VELOCITY Z"}
+ call ground crew runtime trace
  drive ambumedic
+ call ground crew runtime trace
+ call ground crew runtime trace
  WAIT {"var":["L:HOLDING","number"]}
+ call ground crew runtime trace
  WAIT {"object":"ambumedic","var":"VELOCITY Z"}
  SLEEP 2
+ call ground crew runtime trace
  WAIT {"object":"ambumedic","var":"VELOCITY Z"}
  SLEEP 2
+ call ground crew runtime trace
+ call ground crew runtime trace
  WAIT {"object":"ambustretcher","var":"VELOCITY Z"}
  SLEEP 2
+ call ground crew runtime trace
  WAIT {"object":"ambustretcher","var":"VELOCITY Z"}
  SLEEP 2
- WAIT {"has_object":"ambumedic"}
- WAIT {"has_object":"ambustretcher"}
- drive ambulance5
- SLEEP 1
- WAIT {"object":"ambulance5","var":"VELOCITY Z"}
- SLEEP 0.8
- drive ambulance5
+ call ground crew runtime trace
+ call ambu_5_route_and_start_travel_to_hospital
  SLEEP 3
  drive hoist_crew
+ call ground crew runtime trace
  WAIT {"local":"PAPERWORK"}
  drive hoist_crew
  SLEEP 0.2
  trigger PAX_2_ON
  trigger PAX_3_ON
  call Return to base or continue menu
```

## Ambulance destination hoist  (sleeps base 25, now 21)
```
+ call ground crew runtime trace
  WAIT {"var":["L:HOISTED","number"]}
  msg "Route set to: closest ambulance"
  SLEEP 5
- msg "Ambulance Location: {0:LOCATION}"
+ msg "Ambulance Location: {0:LOCATION} ({1})"
+ call ground crew runtime trace
  WAIT {"local":"ambu1arrived"}
  call Closest Ambulance WPs
  SLEEP [10,20]
+ call ground crew runtime trace
+ call ground crew runtime trace
+ call ground crew runtime trace
  drive ambustretcher3
+ call ground crew runtime trace
  SLEEP [2,3]
+ call ground crew runtime trace
  drive ambumedic3
+ call ground crew runtime trace
+ call ground crew runtime trace
  WAIT {"object":"ambustretcher3","var":"VELOCITY Z"}
+ call ground crew runtime trace
  WAIT {"location":"hospital_user","var":"distance"}
+ call ground crew runtime trace
  WAIT {"location":"hospital_user","var":"distance"}
+ call ground crew runtime trace
  WAIT {"location":"hospital_user","var":"distance"}
  SLEEP 4
+ call ground crew runtime trace
  WAIT {"location":"hospital_user","var":"distance"}
  SLEEP 1
  SLEEP 1
  call Patient status
+ call ground crew runtime trace
  WAIT {"location":"hospital_user","var":"distance:m"}
+ call ground crew runtime trace
  WAIT {"var":["GPS GROUND SPEED","knots"]}
  SLEEP 1
  msg "LAND AND SET ENGINES TO IDLE or STOP to start unload procedu"
+ call ground crew runtime trace
  WAIT {"var":["L:{local:HXX}_SDK_ROTOR_RPM","number"]}
  msg " "
+ call ops progress timed
+ call ground crew runtime trace
  WAIT {"local":"closestretcherarrived"}
+ call ground crew runtime trace
  drive ambumedic3
+ call ground crew runtime trace
+ call ground crew runtime trace
  drive ambumedic3
- WAIT {"var":["L:{local:HXX}_SDK_ROTOR_RPM","number"]}
+ call ground crew runtime trace
+ call ground ops NR gate
  msg "Set engines to OFF and stop the rotor to start operations"
+ call ground crew runtime trace
  WAIT {"var":["L:{local:HXX}_SDK_ROTOR_RPM","number"]}
+ call ground crew runtime trace
  WAIT {"local":"ambu1arrived"}
  msg "Patient unloading procedures started, please wait..."
  trigger HOIST_CONTROL_MODE_MANUAL
  SLEEP 2
  SLEEP 1
  SLEEP 1
+ call ground crew runtime trace
  WAIT {"local":"closestretcherarrived"}
+ call ground crew runtime trace
  drive ambustretcher3
+ call ground crew runtime trace
+ call ground crew runtime trace
  drive ambustretcher3
+ call ground crew runtime trace
+ call voice hospital handover
  SLEEP 2.5
+ call ground crew runtime trace
  SLEEP 2.5
  trigger HOIST_CONTROL_MOTOR_MOMENTARY_DOWN
  SLEEP 1
  SLEEP 1
  SLEEP 2
  trigger HOIST_CONTROL_MODE_AUTO
+ call ground crew runtime trace
  drive ambumedic3
+ call ground crew runtime trace
  msg "Patient unloading completed"
+ call post dispatcher message
  SLEEP 2
  SLEEP 1
+ call ground crew runtime trace
  drive ambustretcher3
+ call ground crew runtime trace
  SLEEP 3
- call Query closest hospital unrelated for stretcher
- SLEEP 20
- SLEEP 1
- WAIT {"object":"ambulance1","var":"VELOCITY Z"}
- SLEEP 0.8
- drive ambulance1
- SLEEP 60
+ call ground crew runtime trace
+ call ground crew runtime trace
+ call shared repeated block 064
+ call ensure door
+ call ground crew runtime trace
  WAIT {"fn":"HOIST_REEL_UP_AND_STOW","params":{}}
  SLEEP 3
  drive hoist_crew
  SLEEP 0.2
  trigger PAX_2_ON
  trigger PAX_3_ON
  SLEEP 2
  call Return to base or continue menu
```

## user destination hoist predefined  (sleeps base 4, now 3)
```
  SLEEP 0.2
  SLEEP 0.2
- call Query closest hospital unrelated for stretcher
- SLEEP 1
+ call hospital_creation_from_unhospital
  call Ambulance5
  SLEEP 0.2
- drive ambulance5
- drive ambulance5
+ call drive ambulance5 safe
+ call drive ambulance5 safe
+ call ground crew runtime trace
  WAIT {"location":"hospital_user","var":"distance"}
+ call ground crew runtime trace
+ call ground crew runtime trace
+ call ground crew runtime trace
+ call ground crew runtime trace
```
