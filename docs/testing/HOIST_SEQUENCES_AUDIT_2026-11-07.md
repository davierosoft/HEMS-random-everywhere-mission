# Hoist sequences, base vs 170.17 sources (2026-11-07)

Only cable operations. Every action is listed in order; SLEEP is a pause in seconds, [a,b] random between a and b. First column: space = identical in baseline and now, - = only in baseline, + = only now. EVENT = aircraft/cabin event sent to the simulator (names as in the mission).

## HOISTING

### sequence 1
```
  IF {"local":"CREW"} eq3
  IF {"local":"CREW"} eq5
  SLEEP 0.2
  IF {"local":"SECOND_HOIST"} eq1
    MSG "Personnel 2 to ground"
  ELSE
    MSG "Personnel 1 to ground"
  SLEEP 3
  WAIT {"local":"HOLDHOISTED"}
  IF {"and":[{"require":{"global":"HOIST_ARMING"},"ne":"auto"},{".. eq1
-   MSG "Set HOIST switch to ON position to start hoist operations"
-   PARALLEL THREAD:
-       SLEEP [20,60]
-   WAIT {"var":["L:H145_SDK_OH_HOIST","number"]}
+   MACRO set hoist switch to on
  SLEEP [2,4]
  SET {"local":"HR_HOISTING_LOCK"} = 1
  IF {"local":"SECOND_HOIST"} eq1
    PARALLEL THREAD:
      MSG "Personnel 2 to ground"
      SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_OFF","number"]} = 0
      SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_BAG_OFF","number"]} = 0
      IF {"local":"CREW"} eq4
        EVENT PILOT_FO_OFF + PAX_1_ON + PAX_2_ON
      SLEEP [2,4]
      IF {"local":"HELIRESCUER_BOARDED"} eq0
-       DOOR open pax_right
+       MACRO ensure door door=pax_right want=open
        SLEEP [2,4]
        EVENT HOIST_ARM_DEPLOY
      SLEEP 1
-     CREATE hpax1
      SET {"object":"hpax1","var":"VAR 1"} = -1
      SET {"object":"hpax1","var":"COUPLED"} = 1
      SLEEP 2
      SLEEP [3,5]
      MSG "Steady!"
      SLEEP [5,10]
      SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_ON","number"]} = 0
      SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_BAG_ON","number"]} = 0
      IF {"local":"CREW"} eq4
        EVENT PILOT_FO_OFF + PAX_1_OFF + PAX_2_ON
      IF {"local":"CREW"} eq5
        EVENT PAX_1_OFF
      SLEEP [5,15]
      MSG "Hoist is running down"
      SLEEP 1
      MACRO hoist down
      MSG "Personnel on ground...Hold on..."
      SLEEP [3,5]
      SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_OFF","number"]} = 0
      SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_BAG_OFF","number"]} = 0
      SET {"object":"hpax1","var":"VAR 1"} = 1
      SET {"object":"hpax1","var":"VAR 2"} = 0
      MSG "Personnel on ground and disconnected"
      SET {"object":"hpax1","var":"COUPLED"} = 0
      SLEEP [1,3]
      MSG "Hoist is running up"
      MACRO hoist up empty
      MSG "hoist is clear"
      WALK hpax1 VAR1=3
      SET {"object":"hpax1","var":"VAR 1"} = 1
      SET {"var":["L:PAX_HOIST","number"]} = 1
      WAIT {"local":"HOLDHOISTED"}
+     IF {"local":"HELIRESCUER_BOARDED"} ne0
+       SLEEP 2
      SLEEP [2,5]
      SET {"local":"HOLDHOISTED"} = 0
      WALK hpax1 VAR1=3
```

### sequence 2
```
    WAIT {"var":["L:PAX_HOIST","number"]}
  SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_OFF","number"]} = 0
  SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_BAG_OFF","number"]} = 0
  IF {"local":"SECOND_HOIST"} eq0
    MSG "Personnel 1 to ground"
    IF {"local":"CREW"} ne5
      EVENT PILOT_FO_OFF + PAX_2_ON
    IF {"local":"CREW"} gt3
      EVENT PAX_1_ON
    IF {"and":[{"require":{"global":"HOIST_ARMING"},"ne":"auto"},{".. eq1
-     MSG "Set HOIST switch to ON position to start hoist operations"
-     PARALLEL THREAD:
-       SLEEP [20,60]
-     WAIT {"var":["L:H145_SDK_OH_HOIST","number"]}
+     MACRO set hoist switch to on
    SLEEP [2,4]
    IF {"local":"HELIRESCUER_BOARDED"} eq0
-     DOOR open pax_right
+     MACRO ensure door door=pax_right want=open
      SLEEP [2,4]
      EVENT HOIST_ARM_DEPLOY
      SLEEP [2,4]
  MSG "Steady!"
  SLEEP [5,20]
  SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_ON","number"]} = 0
  SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_BAG_ON","number"]} = 0
  EVENT PAX_2_ON + PAX_3_OFF
  SLEEP [5,20]
  SLEEP [1,2]
  MSG "Hoist is running down"
  MACRO hoist down
  MSG "Personnel on ground...Hold on..."
  SLEEP [3,5]
  SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_OFF","number"]} = 0
  SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_BAG_OFF","number"]} = 0
  MSG "Personnel on ground and disconnected"
  SET {"object":"hoist_crew","var":"COUPLED"} = 0
  SET {"object":"hoist_crew","var":"VAR 1"} = 1
  SLEEP [2,3]
  MSG "hoist is running up"
  MACRO hoist up empty
  MSG "hoist is clear"
  SLEEP 2
  EVENT HOIST_ARM_STOW
  SLEEP 2
  DOOR close pax_right
  SLEEP 1
+ MACRO voice crew out clear
  MSG "Medic on ground, helicopter clear, free to leave hover"
  SET {"local":"HOLDHOISTED"} = 1
+ IF {"local":"HELIRESCUER_BOARDED"} ne0
+   MSG "Crew is waiting for the heli-rescuer, who is coming to the hoist point.."
+   SLEEP 2
  SLEEP [1,5]
```

## Hoisting back up

### sequence 1
```
      SET {"var":["L:PAX_HOIST","number"]} = 0
+     MSG "Second hoist: hold the hover over the landing spot, speed under 1 kt, .."
      SET {"local":"HOLDHOISTED"} = 0
      WALK hpax1 VAR1=3
      SLEEP [5,10]
      IF {"local":"HOIST_OUT"} ne0
-       IF {"and":[{"require":{"global":"HOIST_ARMING"},"ne":"auto"},{".. eq1
-       MSG "Set HOIST switch to ON position to start hoist operations"
-       PARALLEL THREAD:
-       SLEEP [20,60]
-       WAIT {"var":["L:H145_SDK_OH_HOIST","number"]}
-       SLEEP [2,4]
-       DOOR open pax_right
-       SLEEP [2,4]
-       EVENT HOIST_ARM_DEPLOY
-       SLEEP 1
-       SLEEP [3,7]
+       MACRO hoist_arming_and extension
      MSG "Hoist is running down, stay within 20m from operator"
      MACRO hoist down
      MSG "Hoist on ground, personnel are getting hooked"
      SLEEP [3,6]
      SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_ON","number"]} = 0
      SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_BAG_ON","number"]} = 0
      SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_STRETCHER_OFF","number"]} = 0
      REMOVE hpax1
      MSG "Hoist is running up"
      MACRO hoist up 1 operator
      SLEEP 1
      MSG "Hoist is up, personnel are strapped in"
      SLEEP [3,10]
      SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_OFF","number"]} = 0
      SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_BAG_OFF","number"]} = 0
      EVENT PAX_1_ON
      SET {"var":["L:PAX_HOIST","number"]} = 1
      IF {"local":"HOIST_OUT"} eq0
        IF {"local":"CREW"} eq4
        SLEEP [3,7]
```

### sequence 2
```
  IF {"local":"whobringpatient"} neambudoc
    IF {"local":"HOIST_OUT"} ne0
+     MSG "Waiting for the second hoist to finish before the main hoist starts"
      WAIT {"var":["L:PAX_HOIST","number"]}
      SLEEP [3,10]
    ELSE
-     IF {"and":[{"require":{"global":"HOIST_ARMING"},"ne":"auto"},{".. eq1
-       MSG "Set HOIST switch to ON position to start hoist operations"
-       PARALLEL THREAD:
-       SLEEP [20,60]
-       WAIT {"var":["L:H145_SDK_OH_HOIST","number"]}
-     SLEEP [2,4]
-     DOOR open pax_right
-     SLEEP [2,4]
-     EVENT HOIST_ARM_DEPLOY
-     SLEEP 1
-     SLEEP [3,7]
+     MACRO hoist_arming_and extension
    SLEEP 2
    MSG "Hoist is running down, stay within 20m from operator"
    MACRO hoist down
    MSG "Hoist on ground, personnel are getting hooked... hold on..."
    IF {"local":"whobringpatient"} equs
      SLEEP [3,7]
      SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_STRETCHER_ON","number"]} = 0
+     IF {"local":"HEMS_PATIENT_NUMBER"} eq1
        IF {"has_object":"injured_human"} eq1
        REMOVE injured_human
+     IF {"local":"HEMS_PATIENT_NUMBER"} eq2
+       IF {"has_object":"injured_human2"} eq1
+       REMOVE injured_human2
+     IF {"local":"HEMS_PATIENT_NUMBER"} eq3
+       IF {"has_object":"injured_human3"} eq1
+       REMOVE injured_human3
    SLEEP [2,5]
    SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_ON","number"]} = 0
    SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_BAG_ON","number"]} = 0
+   IF {"has_object":"hoist_crew"} eq1
      REMOVE hoist_crew
    SLEEP [2,5]
    MSG "Hoist is running up"
    IF {"local":"whobringpatient"} eqambulance
      SLEEP 0.5
    IF {"local":"HOIST_OUT"} eq0
      SLEEP [2,3]
      MSG "Hoist is running up"
      IF {"local":"whobringpatient"} equs
        MACRO hoist up operator+injured
      ELSE
        MACRO hoist up 1 operator
      MSG "Hoist is up, personnel are getting strapped in"
      SLEEP [5,10]
      SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_OFF","number"]} = 0
      SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_BAG_OFF","number"]} = 0
      SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_STRETCHER_OFF","number"]} = 0
      EVENT PAX_3_ON
      IF {"local":"whobringpatient"} equs
+       EVENT HEMS_STRETCHER_PATIENT
      SET {"var":["L:PAX_HOIST","number"]} = 1
      IF {"local":"SECOND_HOIST"} eq0
        IF {"local":"HELIRESCUER_BOARDED"} ne0
        SET {"local":"HR_HOISTING_LOCK"} = 0
        WAIT {"local":"HR_HOISTING_LOCK"}
        ELSE
        WAIT {"fn":"HOIST_REEL_UP_AND_STOW","params":{}}
        SLEEP [3,7]
        IF {"local":"CREW"} ne5
        EVENT PILOT_FO_ON + PAX_2_OFF
        IF {"local":"CREW"} gt3
        EVENT PAX_1_ON
        ELSE
        EVENT PILOT_FO_ON + PAX_1_ON + PAX_2_ON + PAX_3_ON
        IF {"local":"HELIRESCUER_BOARDED"} eq0
+       MACRO voice hoist all inside
        SET {"local":"HR_HOISTING_LOCK"} = 0
    ELSE
      MACRO hoist up operator+injured
      SLEEP [0,2]
      MSG "Hoist is up, boom extended, patient and doctor outside, hooked to hois.."
      SLEEP [5,9]
      SET {"local":"HR_HOISTING_LOCK"} = 0
-     IF {"global":"DIFFICULTY"} ne0
+     IF {"global":"HOIST_SAFETY_MONITOR"} eqyes
        PARALLEL THREAD:
        WAIT {"var":["AIRSPEED INDICATED","knots"]}
        IF {"local":"HOIST_OUT"} ne0
        MSG "We are passing Hoist extended+load VNE speed (70kts). Reduce speed or .."
```

## hoist heli rescuer down

### sequence 1
```
  PARALLEL THREAD:
    IF {"global":"CREWTRK"} eq1
      PARALLEL THREAD:
        WAIT {"has_object":"jolly"}
-   CREATE jolly
    SET {"object":"jolly","var":"VAR 1"} = -1
    SET {"object":"jolly","var":"COUPLED"} = 1
    WAIT {"local":"HOLDHOISTED"}
    SLEEP [2,4]
    IF {"and":[{"require":{"global":"HOIST_ARMING"},"ne":"auto"},{".. eq1
-     MSG "Set HOIST switch to ON position to start hoist operations"
-     PARALLEL THREAD:
-       SLEEP [20,60]
-     WAIT {"var":["L:H145_SDK_OH_HOIST","number"]}
+     MACRO set hoist switch to on
    SLEEP [2,4]
    IF {"local":"CREW"} eq4
      MSG "Personnel 3 to ground"
    ELSE
      EVENT PILOT_FO_OFF + PAX_1_ON + PAX_2_ON
      MSG "Personnel 2 to ground"
    SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_OFF","number"]} = 0
    SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_BAG_OFF","number"]} = 0
    SLEEP 1
+   MACRO ensure door door=pax_right want=open
+   IF {"param":"hrd_door"} eq1
+     SLEEP 2
    EVENT HOIST_ARM_DEPLOY
    SLEEP 1
    SLEEP 2
    SLEEP [2,3]
    SLEEP [3,5]
    MSG "Steady!"
    SLEEP [5,10]
    SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_ON","number"]} = 0
    SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_BAG_ON","number"]} = 0
    EVENT PAX_1_OFF
    SLEEP [5,15]
    MSG "Hoist is running down"
    MACRO hoist down
    MSG "Personnel are on ground"
    SLEEP [2,5]
    SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_OFF","number"]} = 0
    SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_BAG_OFF","number"]} = 0
    SET {"object":"jolly","var":"COUPLED"} = 0
    SET {"object":"jolly","var":"VAR 1"} = 1
    SET {"object":"jolly","var":"VAR 2"} = 0
    SLEEP [2,3]
    MSG "Hoist is running up"
    MACRO hoist up empty
    SLEEP [0,2]
    MSG "hoist is clear"
    WALK jolly VAR1=3
    SET {"object":"jolly","var":"VAR 1"} = 1
    SLEEP [2,5]
    MSG "waiting for helirescuer to secure the area"
+   MACRO voice say
    WALK jolly VAR1=3
    SET {"object":"jolly","var":"VAR 1"} = 1
    SLEEP [2,5]
```

## hoist heli rescuer up

### sequence 1
```
  PARALLEL THREAD:
    IF {"and":[{"require":{"global":"HOIST_ARMING"},"ne":"auto"},{".. eq1
-     MSG "Set HOIST switch to ON position to start hoist operations"
-     PARALLEL THREAD:
-       SLEEP [20,60]
-     WAIT {"var":["L:H145_SDK_OH_HOIST","number"]}
+     MACRO set hoist switch to on
    SLEEP [2,4]
    IF {"local":"CREW"} eq3
      EVENT PILOT_FO_OFF + PAX_1_OFF + PAX_2_ON
    ELSE
      SLEEP [1,2]
      EVENT PILOT_FO_ON + PAX_1_OFF + PAX_2_ON
    SLEEP [2,4]
-   DOOR open pax_right
+   MACRO ensure door door=pax_right want=open
    SLEEP [1,2]
    EVENT HOIST_ARM_DEPLOY
+   MSG "Heli-rescuer is waiting for a stable hover inside the landing spot"
+   SLEEP [2,4]
    WALK jolly VAR1=3
    SET {"object":"jolly","var":"VAR 1"} = 1
    SET {"local":"HOLDHOISTED"} = 0
    MSG "Hold helicopter position"
    SLEEP [5,10]
    SLEEP [1,2]
    MSG "Hoist is running down, stay within 20m from operator"
    MACRO hoist down
    MSG "Hoist on ground, personnel are getting hooked"
    SLEEP [1,2]
    SET {"object":"jolly","var":"COUPLED"} = 1
    SLEEP [2,5]
    SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_ON","number"]} = 0
    SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_BAG_ON","number"]} = 0
    SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_STRETCHER_OFF","number"]} = 0
    REMOVE jolly
    SLEEP [2,5]
    MSG "Hoist is running up"
    MACRO hoist up 1 operator
    SLEEP [0,2]
    MSG "Hoist is up, personnel are strapped in"
    SLEEP [3,10]
    SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_OFF","number"]} = 0
    SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_BAG_OFF","number"]} = 0
    EVENT PAX_1_ON
    SLEEP [3,7]
    WAIT {"fn":"HOIST_REEL_UP_AND_STOW","params":{}}
    SLEEP [3,6]
    IF {"local":"CREW"} eq3
```

## pick heli rescuer hoist

### sequence 1
```
  WAIT {"location":"heli_rescuer_location","var":"distance:m"}
  MSG "Manoeuvre the helicopter to hoist point"
  SLEEP 3.9
  MSG "Ready for hoisting operation, Set hover conditions"
  MSG "Hold helicopter position"
  IF {"and":[{"require":{"global":"HOIST_ARMING"},"ne":"auto"},{".. eq1
-   MSG "Set HOIST switch to ON position to start hoist operations"
-   PARALLEL THREAD:
-       SLEEP [20,60]
-   WAIT {"var":["L:H145_SDK_OH_HOIST","number"]}
+   MACRO set hoist switch to on
  SLEEP [2,4]
  IF {"local":"CREW"} eq4
    MSG "Hoist one to helicopter"
    SLEEP 2
    EVENT PILOT_FO_ON + PAX_1_OFF + PAX_2_ON
    SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_STRETCHER_OFF","number"]} = 0
  IF {"local":"CREW"} eq3
    IF {"global":"SECOND_HR"} eqyes
      MSG "Hoist two to helicopter"
    ELSE
      MSG "Hoist one to helicopter"
    SLEEP [2,3]
    EVENT PILOT_FO_OFF + PAX_1_OFF + PAX_2_ON
    SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_STRETCHER_OFF","number"]} = 0
  IF {"and":[{"require":{"global":"HOIST_ARMING"},"ne":"auto"},{".. eq1
-   MSG "Set HOIST switch to ON position to start hoist operations"
-   PARALLEL THREAD:
-       SLEEP [20,60]
-   WAIT {"var":["L:H145_SDK_OH_HOIST","number"]}
+   MACRO set hoist switch to on
  SLEEP [2,4]
- DOOR open pax_right
+ MACRO ensure door door=pax_right want=open
  SLEEP [1,3]
  EVENT HOIST_ARM_DEPLOY
  IF {"and":[{"require":{"local":"CREW"},"eq":3},{"require":{"glo.. eq1
    WALK pisteur1 VAR1=3
    SET {"object":"pisteur1","var":"VAR 1"} = 1
    IF {"global":"CREWTRK"} eq1
      PARALLEL THREAD:
        WAIT {"has_object":"pisteur1"}
    SLEEP 1
    MSG "Hoist is running down, stay within 20m from operator"
    MACRO hoist down
    MSG "Hoist on ground, personnel are getting hooked"
    SLEEP [1,2]
    SET {"object":"pisteur1","var":"COUPLED"} = 1
    SLEEP [2,5]
    SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_ON","number"]} = 0
    SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_BAG_ON","number"]} = 0
    REMOVE pisteur1
    SLEEP 2.5
    MSG "Hoist is running up"
    MACRO hoist up 1 operator
    SLEEP [0,2]
    MSG "Hoist is up, personnel are strapped in"
    SLEEP [2,10]
    SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_OFF","number"]} = 0
    SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_BAG_OFF","number"]} = 0
    EVENT PAX_1_ON
    SLEEP [3,5]
    EVENT PILOT_FO_ON + PAX_1_ON + PAX_2_OFF
    SLEEP [3,5]
    EVENT PILOT_FO_ON + PAX_1_OFF + PAX_2_ON
  WALK pisteur2 VAR1=3
  SET {"object":"pisteur2","var":"VAR 1"} = 1
  IF {"global":"CREWTRK"} eq1
    PARALLEL THREAD:
      WAIT {"has_object":"pisteur2"}
  MSG "Hoist is running down, stay within 20m from operator"
  MACRO hoist down
  MSG "Hoist on ground, personnel are getting hooked"
  SLEEP [1,2]
  SET {"object":"pisteur2","var":"COUPLED"} = 1
  SLEEP [2,5]
  SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_ON","number"]} = 0
  SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_BAG_ON","number"]} = 0
  REMOVE pisteur2
  SLEEP 2.5
  MSG "Hoist is running up"
  MACRO hoist up 1 operator
  SLEEP [0,2]
  MSG "Hoist is up, personnel are strapped in"
  SLEEP [3,10]
  SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_OFF","number"]} = 0
  SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_BAG_OFF","number"]} = 0
  EVENT PAX_1_ON
  IF {"local":"CREW"} eq4
    EVENT PILOT_FO_ON + PAX_1_ON + PAX_2_ON
  ELSE
    EVENT PILOT_FO_OFF + PAX_1_ON + PAX_2_ON
```

## drop heli rescuer hoist

### sequence 1
```
- CREATE pisteur2
  SET {"object":"pisteur2","var":"VAR 1"} = -1
  SET {"object":"pisteur2","var":"COUPLED"} = 1
  IF {"local":"HELIRESCUER_BOARDED"} eq2
-   CREATE pisteur1
    SET {"object":"pisteur1","var":"VAR 1"} = -1
    SET {"object":"pisteur1","var":"COUPLED"} = 1
  WAIT {"location":"heli_rescuer_location","var":"distance:m"}
  MSG "Manoeuvre the helicopter to hoist point"
  SLEEP [3,9]
+ IF {"and":[{"require":{"global":"HOIST_ARMING"},"ne":"auto"},{".. eq1
+   MACRO set hoist switch to on
  MSG "Ready for hoisting operation, Set hover conditions"
  MSG "Hold helicopter position"
  MSG "Hold helicopter position"
  SLEEP [1,3]
- IF {"and":[{"require":{"global":"HOIST_ARMING"},"ne":"auto"},{".. eq1
-   MSG "Set HOIST switch to ON position to start hoist operations"
-   PARALLEL THREAD:
-       SLEEP [20,60]
-   WAIT {"var":["L:H145_SDK_OH_HOIST","number"]}
  IF {"local":"CREW"} eq3
    SLEEP [1,3]
    EVENT PILOT_FO_ON + PAX_1_OFF + PAX_2_ON
    SLEEP [2,5]
    EVENT PILOT_FO_OFF + PAX_1_ON + PAX_2_ON
  SLEEP [2,4]
- DOOR open pax_right
+ MACRO ensure door door=pax_right want=open
  SLEEP [1,3]
  EVENT HOIST_ARM_DEPLOY
  SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_STRETCHER_OFF","number"]} = 0
  SLEEP 3
  EVENT PAX_1_OFF
  SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_ON","number"]} = 0
  SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_BAG_ON","number"]} = 0
  SLEEP [5,15]
  MSG "Hoist is running down"
  MACRO hoist down
  MSG "Personnel are on ground"
  SLEEP [2,5]
  SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_OFF","number"]} = 0
  SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_BAG_OFF","number"]} = 0
  SET {"object":"pisteur2","var":"VAR 1"} = 1
  SET {"object":"pisteur2","var":"COUPLED"} = 0
  SLEEP [2,3]
  MSG "Hoist is running up"
  MACRO hoist up empty
  SLEEP [0,2]
  WALK pisteur2 VAR1=3
  IF {"local":"HELIRESCUER_BOARDED"} eq2
    EVENT PILOT_FO_OFF + PAX_1_ON + PAX_2_ON
    WAIT {"location":"heli_rescuer_location","var":"distance:m"}
    MSG "Personnel, 1 to ground"
    MSG "Hold helicopter position"
    SLEEP 5
    SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_ON","number"]} = 0
    SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_BAG_ON","number"]} = 0
    EVENT PAX_1_OFF
    SLEEP [5,15]
    MSG "Hoist is running down"
    MACRO hoist down
    MSG "Personnel are on ground"
    SLEEP [2,5]
    SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_OFF","number"]} = 0
    SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_BAG_OFF","number"]} = 0
    SET {"object":"pisteur1","var":"VAR 1"} = 1
    SET {"object":"pisteur1","var":"COUPLED"} = 0
    SLEEP [2,3]
    MSG "Hoist is running up"
    MACRO hoist up empty
    SLEEP [0,2]
  WAIT {"fn":"HOIST_REEL_UP_AND_STOW","params":{"before_stow_commands":[]}}
  IF {"local":"HELIRESCUER_BOARDED"} eq2
    WALK pisteur1 VAR1=3
  SLEEP 5
  IF {"local":"CREW"} eq3
    EVENT PILOT_FO_ON + PAX_1_OFF + PAX_2_OFF
  ELSE
    EVENT PILOT_FO_ON + PAX_1_ON + PAX_2_OFF
+ MACRO cabin has crew aboard
```

## 5 crew SKID LDG

### sequence 1
```
    SET {"object":"pax3","var":"VAR 1"} = 5
    SLEEP 1
    SET {"object":"hoist_crew","var":"VAR 1"} = 5
    SET {"object":"pax3","var":"VAR 1"} = 5
    SLEEP 2
    SET {"object":"hoist_crew","var":"VAR 1"} = 5
    MSG "Hold helicopter position"
    IF {"local":"HELIRESCUER_BOARDED"} eq0
      EVENT PAX_2_ON + PILOT_FO_OFF
    IF {"and":[{"require":{"global":"HOIST_ARMING"},"ne":"auto"},{".. eq1
-     MSG "Set HOIST switch to ON position to start hoist operations"
-     PARALLEL THREAD:
-       SLEEP [20,60]
-     WAIT {"var":["L:H145_SDK_OH_HOIST","number"]}
+     MACRO set hoist switch to on
    SLEEP 2
    EVENT HOIST_ARM_DEPLOY
    SLEEP 5
    WALK pax3 VAR1=5
    SET {"object":"pax3","var":"VAR 1"} = 5
    PARALLEL THREAD:
-     WALK injured_human VAR1=1
+     WALK {local:HEMS_PATIENT_OBJECT} VAR1=1
    MSG "hoist 1 plus stretcher to helicopter"
    SLEEP [3,5]
    WAIT {"fn":"HOIST_SEND_TO_GROUND","params":{"distance":0.02,"target":"pax3","before_s..
    SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_ON","number"]} = 0
```

### sequence 2
```
    SLEEP 1
    SET {"object":"pax3","var":"VAR 1"} = 5
    SLEEP 1
    SET {"object":"hoist_crew","var":"VAR 1"} = 5
    SET {"object":"pax3","var":"VAR 1"} = 5
    SLEEP [2,4]
    SET {"object":"hoist_crew","var":"VAR 1"} = 5
    MSG "Hold helicopter position"
    IF {"var":["RADIO HEIGHT","feet"]} gt10
      IF {"and":[{"require":{"global":"HOIST_ARMING"},"ne":"auto"},{".. eq1
-       MSG "Set HOIST switch to ON position to start hoist operations"
-       PARALLEL THREAD:
-       SLEEP [20,60]
-       WAIT {"var":["L:H145_SDK_OH_HOIST","number"]}
+       MACRO set hoist switch to on
      SLEEP [2,4]
      EVENT HOIST_ARM_DEPLOY
      SLEEP 6
      WALK pax3 VAR1=5
      SET {"object":"pax3","var":"VAR 1"} = 5
      MSG "hoist 1 to helicopter"
      SLEEP [2,4]
      WAIT {"fn":"HOIST_SEND_TO_GROUND","params":{"distance":0.025,"target":"pax3","before_..
      SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_ON","number"]} = 0
      SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_BAG_ON","number"]} = 0
      SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_STRETCHER_OFF","number"]} = 0
+     IF {"has_object":"pax3"} eq1
```

### sequence 3
```
    MSG "approach as close as possible to the crew"
    SET {"object":"hoist_crew","var":"VAR 1"} = 5
    SLEEP 1.5
    SLEEP 3
    MSG "Hold helicopter position"
  WALK hoist_crew VAR1=5
  SET {"object":"hoist_crew","var":"VAR 1"} = 5
  SLEEP 1
  IF {"var":["RADIO HEIGHT","feet"]} gt10
    IF {"and":[{"require":{"global":"HOIST_ARMING"},"ne":"auto"},{".. eq1
-     MSG "Set HOIST switch to ON position to start hoist operations"
-     PARALLEL THREAD:
-       SLEEP [20,60]
-     WAIT {"var":["L:H145_SDK_OH_HOIST","number"]}
+     MACRO set hoist switch to on
    SLEEP [2,4]
    EVENT HOIST_ARM_DEPLOY
    SLEEP 6
    MSG "hoist 1 to helicopter"
    SLEEP [5,10]
    WAIT {"fn":"HOIST_SEND_TO_GROUND","params":{"distance":0.01,"target":"hoist_crew","be..
    SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_ON","number"]} = 0
    SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_BAG_ON","number"]} = 0
+   IF {"has_object":"hoist_crew"} eq1
      REMOVE hoist_crew
    MSG "Hoist is running up"
    SLEEP 1
```

## 4 crew SKID LDG

### sequence 1
```
    MSG "approach as close as possible to the crew"
    SLEEP 1
    SET {"object":"pax3","var":"VAR 1"} = 5
    SLEEP 1
    SET {"object":"hoist_crew","var":"VAR 1"} = 5
    SET {"object":"pax3","var":"VAR 1"} = 5
    SLEEP 2
    SET {"object":"hoist_crew","var":"VAR 1"} = 5
    MSG "Hold helicopter position"
    IF {"and":[{"require":{"global":"HOIST_ARMING"},"ne":"auto"},{".. eq1
-     MSG "Set HOIST switch to ON position to start hoist operations"
-     PARALLEL THREAD:
-       SLEEP [20,60]
-     WAIT {"var":["L:H145_SDK_OH_HOIST","number"]}
+     MACRO set hoist switch to on
    SLEEP [2,4]
    EVENT PILOT_FO_OFF + PAX_2_ON
    SLEEP [1,2]
-   DOOR open pax_right
+   MACRO ensure door door=pax_right want=open
    EVENT HOIST_ARM_DEPLOY
    SLEEP 5
    WALK pax3 VAR1=5
    SET {"object":"pax3","var":"VAR 1"} = 5
    PARALLEL THREAD:
-     WALK injured_human VAR1=1
+     WALK {local:HEMS_PATIENT_OBJECT} VAR1=1
    SLEEP 1
    MSG "hoist 1 plus stretcher to helicopter"
    SLEEP 1.5
    WAIT {"fn":"HOIST_SEND_TO_GROUND","params":{"distance":0.02,"target":"hoist_crew","be..
```

### sequence 2
```
    SLEEP 1
    SET {"object":"pax3","var":"VAR 1"} = 5
    SLEEP 1
    SET {"object":"hoist_crew","var":"VAR 1"} = 5
    SET {"object":"pax3","var":"VAR 1"} = 5
    SLEEP 2
    SET {"object":"hoist_crew","var":"VAR 1"} = 5
    MSG "Hold helicopter position"
    EVENT PILOT_FO_OFF + PAX_2_ON
    IF {"and":[{"require":{"global":"HOIST_ARMING"},"ne":"auto"},{".. eq1
-     MSG "Set HOIST switch to ON position to start hoist operations"
-     PARALLEL THREAD:
-       SLEEP [20,60]
-     WAIT {"var":["L:H145_SDK_OH_HOIST","number"]}
+     MACRO set hoist switch to on
    SLEEP [2,4]
-   DOOR open pax_right
+   MACRO ensure door door=pax_right want=open
    EVENT HOIST_ARM_DEPLOY
    SLEEP 6
    WALK pax3 VAR1=5
    SET {"object":"pax3","var":"VAR 1"} = 5
    MSG "hoist 1 to helicopter"
    SLEEP 2
    WAIT {"fn":"HOIST_SEND_TO_GROUND","params":{"distance":0.02,"target":"hoist_crew","be..
    SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_ON","number"]} = 0
    SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_BAG_ON","number"]} = 0
    SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_STRETCHER_OFF","number"]} = 0
+   IF {"has_object":"pax3"} eq1
```

### sequence 3
```
+     IF {"has_object":"pax3"} eq1
        REMOVE pax3
    WALK hoist_crew VAR1=3
    SET {"object":"hoist_crew","var":"VAR 1"} = 1
    MSG "approach as close as possible to the crew"
    SET {"object":"hoist_crew","var":"VAR 1"} = 5
    SLEEP 3
    MSG "Hold helicopter position"
    EVENT PILOT_FO_OFF + PAX_2_ON
    IF {"and":[{"require":{"global":"HOIST_ARMING"},"ne":"auto"},{".. eq1
-     MSG "Set HOIST switch to ON position to start hoist operations"
-     PARALLEL THREAD:
-       SLEEP [20,60]
-     WAIT {"var":["L:H145_SDK_OH_HOIST","number"]}
+     MACRO set hoist switch to on
    SLEEP [2,4]
-   DOOR open pax_right
+   MACRO ensure door door=pax_right want=open
    EVENT HOIST_ARM_DEPLOY
    SLEEP 6
  WALK hoist_crew VAR1=5
  SET {"object":"hoist_crew","var":"VAR 1"} = 5
  SLEEP 1
  IF {"var":["RADIO HEIGHT","feet"]} gt10
    MSG "hoist 1 to helicopter"
    SLEEP [5,10]
    WAIT {"fn":"HOIST_SEND_TO_GROUND","params":{"distance":0.01,"target":"hoist_crew","be..
    SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_ON","number"]} = 0
    SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_BAG_ON","number"]} = 0
```

## 3 crew SKID LDG

### sequence 1
```
+ MACRO select HEMS patient
+ IF {"local":"HEMS_TRANSPORT_TICKET"} nenull
+   MACRO prepare selected HEMS patient
+   IF {"param":"prepared"} ne1
+ ELSE
+   IF {"param":"dwait"} eq0
+   SLEEP 5
+   MACRO select patient1 transport
+   IF {"param":"dwait"} gte12
+ IF {"or":[{"require":{"local":"whobringpatient"},"eq":"us"},{"r.. eq1
+   MACRO select patient1 transport
+ IF {"local":"whobringpatient"} equs
+   MSG "Crew is preparing the patient for hoist loading"
+   IF {"and":[{"require":{"global":"HOIST_ARMING"},"ne":"auto"},{".. eq1
+     MACRO set hoist switch to on
+   PARALLEL THREAD:
+     SLEEP 1
+     WAIT {"object":"hoist_crew","var":"distance:m","to":"{local:HEMS_PATIENT_OBJECT}"}
+     WALK {local:HEMS_PATIENT_OBJECT} VAR1=1
+   WALK hoist_crew VAR1=3
+   SET {"object":"hoist_crew","var":"VAR 1"} = 1
+   WAIT {"has_object":"{local:HEMS_PATIENT_OBJECT}"}
+   MSG "Approach as close as possible to the crew"
+   SLEEP 1
+   SET {"object":"hoist_crew","var":"VAR 1"} = 5
+   SET {"object":"hoist_crew","var":"VAR 1"} = 5
+   SLEEP 2
+   MSG "Hold helicopter position"
+   SLEEP [2,4]
+   EVENT PILOT_FO_OFF + PAX_2_ON
+   SLEEP [2,4]
+   MACRO ensure door door=pax_right want=open
+   EVENT HOIST_ARM_DEPLOY
+   SLEEP 5
+   PARALLEL THREAD:
+     WAIT {"object":"hoist_crew","var":"distance:m","to":"{local:HEMS_PATIENT_OBJECT}"}
+     WALK {local:HEMS_PATIENT_OBJECT} VAR1=1
+   WALK hoist_crew VAR1=5
+   WAIT {"local":"SKID_PATIENT_UNDER_HOIST"}
+   SLEEP 1
+   MSG "Hoist 1 plus stretcher to helicopter"
+   SLEEP 1.5
+   WAIT {"fn":"HOIST_SEND_TO_GROUND","params":{"distance":0.02,"target":"hoist_crew","be..
+   SLEEP [2,5]
+   SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_STRETCHER_ON","number"]} = 0
+   SLEEP [2,5]
+   IF {"has_object":"hoist_crew"} eq1
+     REMOVE hoist_crew
+   SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_ON","number"]} = 0
+   SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_BAG_ON","number"]} = 0
+   SLEEP 1
+   MSG "Hoist is running up"
+   MACRO hoist up operator+injured
+   MSG "Hoist is up, personnel are getting strapped in"
+   SLEEP [5,10]
+   SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_STRETCHER_OFF","number"]} = 0
+   EVENT HEMS_STRETCHER_PATIENT
+   SLEEP [3,7]
+   SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_OFF","number"]} = 0
+   SET {"var":["H:{local:HXX}_SDK_HOIST_OBJ_HUMAN_1_BAG_OFF","number"]} = 0
+   EVENT PAX_3_ON
+   WAIT {"fn":"HOIST_REEL_UP_AND_STOW","params":{"before_stow_commands":[]}}
+   SLEEP [2,5]
```

## hoist_arming_and extension

### sequence 1
```
+ IF {"and":[{"require":{"global":"HOIST_ARMING"},"ne":"auto"},{".. eq1
+   MACRO set hoist switch to on
+ SLEEP [2,4]
+ MACRO ensure door door=pax_right want=open
+ SLEEP [2,4]
+ EVENT HOIST_ARM_DEPLOY
+ SLEEP 1
+ SLEEP [3,7]
+ IF {"and":[{"require":{"global":"HOIST_ARMING"},"ne":"auto"},{".. eq1
+   MSG "Hoist arm is out. Set HOIST switch to ON position to start hoist opera.."
+   WAIT {"var":["L:H145_SDK_OH_HOIST","number"]}
+ MACRO voice hoist precheck
```
