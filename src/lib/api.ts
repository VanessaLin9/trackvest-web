import axios from 'axios'
import { API_BASE } from './env'

export const api = axios.create({ baseURL: API_BASE })
