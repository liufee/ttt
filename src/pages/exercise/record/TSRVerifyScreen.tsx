import React from 'react';
import TsrVerify from '../../../components/tsrVerify';
import ExerciseService from '../../../services/exercise';
import {Record} from '../../../services/exercise/model';

const TSRVerifyScreen = ({ route }: any) => {
    const { type, exercise }:{type:string, exercise:Record} = route.params;

    const exerciseService = ExerciseService.getInstance();

    const formula = 'type+startAt+endAt+ext+paths';
    const createdAt = exercise.startAt;

    return <TsrVerify formula={formula} createdAt={createdAt}
                      getFullOriginalString={
                          async ()=>{
                             const [success, result] = await exerciseService.assembleStrToCreateTSR(exercise.id);
                             if(success){
                                 return [true, result, ''];
                             }else{
                                 return [false, '', result];
                             }
                          }
                      }
                      getTSR={
                          async ()=>{
                              const [success, tsr, err] = await exerciseService.getTSR(exercise.id);
                              if(success){
                                  return [true, tsr, ''];
                              }else{
                                  return [false, '', err];
                              }
                          }
                      }

    ></TsrVerify>;
};

export default TSRVerifyScreen;
