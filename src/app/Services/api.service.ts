import { Injectable } from '@angular/core';
import {tap, catchError} from 'rxjs/operators';
import {HttpClient, HttpHeaders, HttpParams, HttpErrorResponse} from '@angular/common/http';
import { EventEmitter } from '@angular/core';
import { Story } from '../model/Story';
import { StepDefinition } from '../model/StepDefinition';
import { Observable, throwError} from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class ApiService {
  private apiServer: string = sessionStorage.getItem('url_backend');
  public token: string;
  public getStoriesEvent = new EventEmitter();
  public getTokenEvent = new EventEmitter();
  constructor(private http: HttpClient) {
    
  }

  public getHeader() {
    return new HttpHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true'
    });
  }

  public getRepositories(token: string, githubName): Observable<any> {
    let repoToken = token;
    if(!repoToken || repoToken == 'undefined') {
      repoToken = '';
    }
    const options = {headers: this.getHeader()};
    let str = this.apiServer + '/repositories/' + githubName + '/' + repoToken;
    return this.http.get<any>(str, options)
    .pipe(tap(resp => {}),
      catchError(this.handleError));
  }

  handleError(error: HttpErrorResponse) {
    console.log(error);
    return throwError(error);
  }

  public getBackendInfo() {
    if(!sessionStorage.getItem('url_backend')){
      this.http.get<any>(window.location.origin + '/backendInfo').subscribe((backendInfo) => {
        sessionStorage.setItem('url_backend', backendInfo.url);
      });
    }
  }

  public getStories(repository, token) {
    let storytoken = token;
    if(!storytoken || storytoken == 'undefined') {
      storytoken = '';
    }
    return this.http
      .get<Story[]>(this.apiServer + '/stories/' + repository + '/' + storytoken)
      .pipe(tap(resp => {
        this.getStoriesEvent.emit(resp);
      }));
  }

  public getStepDefinitions() {
    return this.http
      .get<StepDefinition>(this.apiServer + '/stepDefinitions')
      .pipe(tap(resp => {
       // console.log('GET step definitions', resp)
      }));
  }

  public addScenario(storyID) {
      return this.http
        .get<any>(this.apiServer + '/scenario/add/' + storyID)
        .pipe(tap(resp => {
         // console.log('Add new scenario in story ' + storyID + '!', resp)
        }));
  }

  public updateBackground(storyID, background) {
    return this.http
        .post<any>(this.apiServer + '/background/update/' + storyID, background)
        .pipe(tap(resp => {
         // console.log('Update background for story ' + storyID )
        }));
  }

  public updateScenario(storyID, scenario) {
    return this.http
        .post<any>(this.apiServer + '/scenario/update/' + storyID, scenario)
        .pipe(tap(resp => {
         // console.log('Update scenario ' + scenario.scenario_id + ' in story ' + storyID, resp)
        }));
  }

  public deleteBackground(storyID) {
    return this.http
        .delete<any>(this.apiServer + '/story/' + storyID + '/background/delete/')
        .pipe(tap(resp => {
        //  console.log('Delete background for story ' + storyID )
        }));
  }

  public deleteScenario(storyID, scenario) {
   return this.http
        .delete<any>(this.apiServer + '/story/' + storyID + '/scenario/delete/' + scenario.scenario_id)
        .pipe(tap(resp => {
         // console.log('Delete scenario ' + scenario.scenario_id + ' in story ' + storyID + '!', resp)
        }));
  }

  // demands testing from the server
  public runTests(storyID, scenarioID) {
    if (scenarioID) {
      return this.http
      .get(this.apiServer + '/runScenario/' + storyID + '/' + scenarioID, {responseType: 'text'});
    }
    return this.http
    .get(this.apiServer + '/runFeature/' + storyID, {responseType: 'text'});
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (token) { return true; }
    return false;
  }

  getToken(): string {
    return localStorage.getItem('token');
  }
}


